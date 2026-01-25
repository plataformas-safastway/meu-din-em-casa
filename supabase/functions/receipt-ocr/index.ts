import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedData {
  amount: number | null;
  date: string | null;
  description: string | null;
  establishment: string | null;
  paymentMethod: string | null;
  cnpj: string | null;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use Gemini with vision capabilities for OCR
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em OCR de documentos fiscais brasileiros. Analise a imagem de recibo, nota fiscal ou comprovante e extraia as informações principais.

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown ou texto adicional
- Use null para campos não identificados
- Valores monetários devem ser números (ex: 45.90, não "R$ 45,90")
- Datas no formato YYYY-MM-DD
- Seja tolerante a erros de leitura e ruído na imagem
- Para pagamento, identifique: CREDIT, DEBIT, PIX, CASH, ou null

Formato de resposta:
{
  "amount": number | null,
  "date": "YYYY-MM-DD" | null,
  "description": "string curta descrevendo a compra" | null,
  "establishment": "nome do estabelecimento" | null,
  "paymentMethod": "CREDIT" | "DEBIT" | "PIX" | "CASH" | null,
  "cnpj": "string sem formatação" | null,
  "confidence": 0-100
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise este recibo/nota fiscal e extraia as informações no formato JSON especificado."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for more consistent extraction
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let extractedData: ExtractedData;
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return partial data if parsing fails
      extractedData = {
        amount: null,
        date: null,
        description: null,
        establishment: null,
        paymentMethod: null,
        cnpj: null,
        confidence: 0,
      };
    }

    // Validate and sanitize the extracted data
    const result: ExtractedData = {
      amount: typeof extractedData.amount === 'number' && extractedData.amount > 0 
        ? Math.round(extractedData.amount * 100) / 100 
        : null,
      date: extractedData.date && /^\d{4}-\d{2}-\d{2}$/.test(extractedData.date)
        ? extractedData.date
        : null,
      description: typeof extractedData.description === 'string' && extractedData.description.length > 0
        ? extractedData.description.substring(0, 200)
        : null,
      establishment: typeof extractedData.establishment === 'string' && extractedData.establishment.length > 0
        ? extractedData.establishment.substring(0, 100)
        : null,
      paymentMethod: ['CREDIT', 'DEBIT', 'PIX', 'CASH'].includes(extractedData.paymentMethod as string)
        ? extractedData.paymentMethod
        : null,
      cnpj: typeof extractedData.cnpj === 'string'
        ? extractedData.cnpj.replace(/\D/g, '').substring(0, 14)
        : null,
      confidence: typeof extractedData.confidence === 'number'
        ? Math.min(100, Math.max(0, extractedData.confidence))
        : 50,
    };

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OCR extraction error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
        data: {
          amount: null,
          date: null,
          description: null,
          establishment: null,
          paymentMethod: null,
          cnpj: null,
          confidence: 0,
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
