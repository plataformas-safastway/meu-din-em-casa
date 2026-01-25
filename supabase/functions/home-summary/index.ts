import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AccountPreview {
  id: string;
  label: string;
  balance: number;
  bankName: string;
  type: string;
}

interface CardPreview {
  id: string;
  label: string;
  projectedBill: number;
  dueDate: string;
  closingDay: number;
  dueDay: number;
  limit: number | null;
  usedPercent: number;
}

interface BestCardSuggestion {
  cardId: string;
  title: string;
  recommendation: string;
  reason: string;
  daysUntilDue: number;
}

serve(async (req) => {
  const startTime = performance.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = month.split("-").map(Number);

    // Get family member
    const { data: familyMember } = await supabase
      .from("family_members")
      .select("family_id, display_name, avatar_url")
      .eq("user_id", userId)
      .single();

    if (!familyMember) {
      return new Response(JSON.stringify({ error: "Family not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const familyId = familyMember.family_id;
    const startDate = `${month}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().split("T")[0];

    // Fetch all data in parallel
    const [
      { data: bankAccounts },
      { data: creditCards },
      { data: transactions },
      { data: banks },
    ] = await Promise.all([
      supabase.from("bank_accounts").select("*").eq("family_id", familyId).eq("is_active", true),
      supabase.from("credit_cards").select("*").eq("family_id", familyId).eq("is_active", true),
      supabase.from("transactions").select("*").eq("family_id", familyId).gte("date", startDate).lte("date", endDate),
      supabase.from("banks").select("*"),
    ]);

    const banksMap = new Map((banks || []).map(b => [b.id, b.name]));

    // Calculate income/expenses
    const income = (transactions || [])
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = (transactions || [])
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balanceGlobal = income - expenses;

    // Build accounts preview
    const accountsPreview: AccountPreview[] = (bankAccounts || []).map(account => {
      const accountTransactions = (transactions || []).filter(t => t.bank_account_id === account.id);
      const accountIncome = accountTransactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const accountExpense = accountTransactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      const balance = (account.initial_balance || 0) + accountIncome - accountExpense;
      
      const bankName = account.bank_id ? banksMap.get(account.bank_id) : account.custom_bank_name;
      
      return {
        id: account.id,
        label: `${bankName || "Banco"} • ${account.nickname}`,
        balance,
        bankName: bankName || "Banco",
        type: account.account_type,
      };
    });

    // Build credit cards preview with projected bills
    const today = new Date();
    const currentDay = today.getDate();

    const creditCardsPreview: CardPreview[] = (creditCards || []).map(card => {
      const cardTransactions = (transactions || []).filter(
        t => t.credit_card_id === card.id && t.type === "expense"
      );
      const projectedBill = cardTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Calculate due date for current billing cycle
      let dueMonth = monthNum;
      let dueYear = year;
      if (card.closing_day && currentDay > card.closing_day) {
        dueMonth++;
        if (dueMonth > 12) {
          dueMonth = 1;
          dueYear++;
        }
      }
      const dueDate = `${dueYear}-${String(dueMonth).padStart(2, "0")}-${String(card.due_day || 10).padStart(2, "0")}`;
      
      const usedPercent = card.credit_limit ? (projectedBill / card.credit_limit) * 100 : 0;

      return {
        id: card.id,
        label: `${card.card_name}`,
        projectedBill,
        dueDate,
        closingDay: card.closing_day || 1,
        dueDay: card.due_day || 10,
        limit: card.credit_limit,
        usedPercent: Math.min(usedPercent, 100),
      };
    });

    // Calculate best card suggestion
    let bestCardSuggestion: BestCardSuggestion | null = null;
    
    if (creditCardsPreview.length > 0) {
      const cardsWithDays = creditCardsPreview
        .filter(card => card.dueDay > 0)
        .map(card => {
          // Calculate days until next billing cycle closes
          const closingDay = card.closingDay;
          let daysUntilClosing: number;
          
          if (currentDay < closingDay) {
            daysUntilClosing = closingDay - currentDay;
          } else {
            // Already closed, next cycle
            const daysInMonth = new Date(year, monthNum, 0).getDate();
            daysUntilClosing = (daysInMonth - currentDay) + closingDay;
          }
          
          // Days from closing to due
          let daysFromClosingToDue = card.dueDay - closingDay;
          if (daysFromClosingToDue < 0) daysFromClosingToDue += 30;
          
          const totalDaysUntilDue = daysUntilClosing + daysFromClosingToDue;
          
          return { ...card, daysUntilDue: totalDaysUntilDue };
        })
        .sort((a, b) => b.daysUntilDue - a.daysUntilDue);

      if (cardsWithDays.length > 0) {
        const best = cardsWithDays[0];
        const formattedDue = new Date(best.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        
        bestCardSuggestion = {
          cardId: best.id,
          title: "Melhor cartão para usar hoje",
          recommendation: `Use o ${best.label}`,
          reason: `Você ganha ${best.daysUntilDue} dias até o vencimento (${formattedDue}).`,
          daysUntilDue: best.daysUntilDue,
        };
      }
    }

    const response = {
      greeting: {
        firstName: familyMember.display_name?.split(" ")[0] || "Usuário",
        photoUrl: familyMember.avatar_url,
      },
      balanceGlobal,
      income,
      expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      accountsPreview: accountsPreview.slice(0, 3),
      hasMoreAccounts: accountsPreview.length > 3,
      totalAccounts: accountsPreview.length,
      creditCardsPreview: creditCardsPreview.slice(0, 2),
      hasMoreCreditCards: creditCardsPreview.length > 2,
      totalCreditCards: creditCardsPreview.length,
      totalCreditCardBill: creditCardsPreview.reduce((sum, c) => sum + c.projectedBill, 0),
      bestCardSuggestion,
    };

    const duration = Math.round(performance.now() - startTime);
    console.log(`[home-summary] Completed in ${duration}ms`);

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Response-Time": `${duration}ms`,
        // Cache for 30 seconds, stale-while-revalidate for 60 more
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error in home-summary:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
