import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedTransaction {
  date: string
  originalDate?: string
  amount: number
  type: 'income' | 'expense'
  description: string
  memo?: string
}

// Parse OFX file content
function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  
  // Find all STMTTRN blocks
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  const matches = content.matchAll(stmttrnRegex)
  
  for (const match of matches) {
    const block = match[1]
    
    // Extract transaction data
    const trntype = block.match(/<TRNTYPE>([^<\n]+)/i)?.[1]?.trim()
    const dtposted = block.match(/<DTPOSTED>([^<\n]+)/i)?.[1]?.trim()
    const trnamt = block.match(/<TRNAMT>([^<\n]+)/i)?.[1]?.trim()
    const name = block.match(/<NAME>([^<\n]+)/i)?.[1]?.trim()
    const memo = block.match(/<MEMO>([^<\n]+)/i)?.[1]?.trim()
    
    if (dtposted && trnamt) {
      const amount = parseFloat(trnamt.replace(',', '.'))
      
      // Parse OFX date format (YYYYMMDD or YYYYMMDDHHMMSS)
      let dateStr = dtposted.substring(0, 8)
      const year = dateStr.substring(0, 4)
      const month = dateStr.substring(4, 6)
      const day = dateStr.substring(6, 8)
      const formattedDate = `${year}-${month}-${day}`
      
      transactions.push({
        date: formattedDate,
        amount: Math.abs(amount),
        type: amount >= 0 ? 'income' : 'expense',
        description: name || memo || trntype || 'Transação importada',
        memo: memo,
      })
    }
  }
  
  return transactions
}

// Parse CSV-like XLS content (simplified - real XLS needs xlsx library)
function parseXLS(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const lines = content.split('\n').filter(line => line.trim())
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const columns = line.split(/[,;\t]/).map(col => col.trim().replace(/\"/g, ''))
    
    if (columns.length >= 3) {
      // Try to find date, description, and amount columns
      let date = ''
      let description = ''
      let amount = 0
      
      for (const col of columns) {
        // Check if it's a date (DD/MM/YYYY or YYYY-MM-DD)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(col)) {
          const [d, m, y] = col.split('/')
          date = `${y}-${m}-${d}`
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(col)) {
          date = col
        }
        // Check if it's an amount
        else if (/^-?\d+[,.]?\d*$/.test(col.replace(/\s/g, ''))) {
          const parsed = parseFloat(col.replace(/\s/g, '').replace(',', '.'))
          if (!isNaN(parsed)) {
            amount = parsed
          }
        }
        // Otherwise treat as description
        else if (col.length > 2 && !description) {
          description = col
        }
      }
      
      if (date && amount !== 0) {
        transactions.push({
          date,
          amount: Math.abs(amount),
          type: amount >= 0 ? 'income' : 'expense',
          description: description || 'Transação importada',
        })
      }
    }
  }
  
  return transactions
}

// Parse PDF using AI for complex Brazilian bank statements
async function parsePDFWithAI(content: string): Promise<ParsedTransaction[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  
  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not available, falling back to regex parsing')
    return parsePDFTextFallback(content)
  }

  try {
    const prompt = `Você é um especialista em extrair transações de extratos bancários brasileiros.

Analise o seguinte texto de um extrato bancário ou fatura de cartão de crédito e extraia TODAS as transações encontradas.

IMPORTANTE:
- Data deve estar no formato YYYY-MM-DD
- Valor deve ser um número positivo (sem símbolo de moeda)
- Tipo: "expense" para débitos/saídas, "income" para créditos/entradas
- Descrição: texto limpo da transação (sem data ou valor)

Retorne APENAS um JSON válido no formato:
{
  "transactions": [
    {
      "date": "2024-01-15",
      "amount": 150.50,
      "type": "expense",
      "description": "SUPERMERCADO CARREFOUR"
    }
  ]
}

Se não encontrar transações, retorne: {"transactions": []}

Texto do extrato:
${content.substring(0, 15000)}`

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      console.error('AI API error:', response.status)
      return parsePDFTextFallback(content)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content || ''
    
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('No JSON found in AI response, falling back to regex')
      return parsePDFTextFallback(content)
    }

    const parsed = JSON.parse(jsonMatch[0])
    const transactions: ParsedTransaction[] = []

    for (const tx of (parsed.transactions || [])) {
      if (tx.date && tx.amount && tx.type) {
        transactions.push({
          date: tx.date,
          amount: Math.abs(Number(tx.amount)),
          type: tx.type === 'income' ? 'income' : 'expense',
          description: String(tx.description || 'Transação importada').substring(0, 200),
        })
      }
    }

    console.log(`AI extracted ${transactions.length} transactions from PDF`)
    return transactions

  } catch (error) {
    console.error('Error parsing PDF with AI:', error)
    return parsePDFTextFallback(content)
  }
}

// Fallback regex-based PDF parser
function parsePDFTextFallback(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const lines = content.split('\n')
  
  // Common patterns in Brazilian bank statements
  const datePattern = /(\d{2}\/\d{2}(?:\/\d{2,4})?)/
  const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*([CD])?/
  
  for (const line of lines) {
    const dateMatch = line.match(datePattern)
    const amountMatch = line.match(amountPattern)
    
    if (dateMatch && amountMatch) {
      let dateStr = dateMatch[1]
      // Add year if not present
      if (dateStr.length === 5) {
        dateStr += '/' + new Date().getFullYear()
      }
      
      const [d, m, y] = dateStr.split('/')
      const year = y.length === 2 ? '20' + y : y
      const formattedDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      
      const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.')
      const amount = parseFloat(amountStr)
      const isDebit = amountMatch[2] === 'D' || line.includes('-')
      
      // Extract description (text between date and amount)
      const dateIndex = line.indexOf(dateMatch[0])
      const amountIndex = line.indexOf(amountMatch[0])
      let description = line.substring(dateIndex + dateMatch[0].length, amountIndex).trim()
      
      if (!description) {
        description = 'Transação importada'
      }
      
      transactions.push({
        date: formattedDate,
        amount: Math.abs(amount),
        type: isDebit ? 'expense' : 'income',
        description: description.substring(0, 200),
      })
    }
  }
  
  return transactions
}

// Simple category detection based on description keywords
function detectCategory(description: string): { categoryId: string; subcategoryId: string | null } {
  const desc = description.toLowerCase()
  
  // Food & Restaurants
  if (/ifood|uber\s*eats|rappi|restaurante|lanchonete|padaria|cafe|pizza|burger|mc\s*donald|subway/.test(desc)) {
    return { categoryId: 'alimentacao', subcategoryId: 'alimentacao-delivery' }
  }
  if (/supermercado|mercado|carrefour|extra|pao\s*de\s*acucar|atacadao/.test(desc)) {
    return { categoryId: 'alimentacao', subcategoryId: 'alimentacao-supermercado' }
  }
  
  // Transport
  if (/uber|99|cabify|taxi|lyft/.test(desc)) {
    return { categoryId: 'transporte', subcategoryId: 'transporte-uber-99' }
  }
  if (/posto|shell|ipiranga|petrobras|br\s*distribuidora|combustivel|gasolina/.test(desc)) {
    return { categoryId: 'transporte', subcategoryId: 'transporte-combustivel' }
  }
  if (/estacionamento|parking|zona\s*azul/.test(desc)) {
    return { categoryId: 'transporte', subcategoryId: 'transporte-estacionamento' }
  }
  
  // Bills & Utilities
  if (/enel|cpfl|light|cemig|eletropaulo|energia|luz/.test(desc)) {
    return { categoryId: 'casa', subcategoryId: 'casa-energia' }
  }
  if (/sabesp|copasa|agua|saneamento/.test(desc)) {
    return { categoryId: 'casa', subcategoryId: 'casa-agua' }
  }
  if (/vivo|claro|tim|oi\s|net\s|internet|telecom/.test(desc)) {
    return { categoryId: 'casa', subcategoryId: 'casa-internet' }
  }
  if (/netflix|spotify|amazon\s*prime|disney|hbo|globoplay|deezer/.test(desc)) {
    return { categoryId: 'lazer', subcategoryId: 'lazer-streaming' }
  }
  
  // Health
  if (/farmacia|drogaria|droga\s*raia|pacheco|drogasil|medicamento/.test(desc)) {
    return { categoryId: 'saude', subcategoryId: 'saude-farmacia' }
  }
  if (/unimed|bradesco\s*saude|sulamerica|amil|plano\s*de\s*saude/.test(desc)) {
    return { categoryId: 'saude', subcategoryId: 'saude-plano' }
  }
  
  // Shopping
  if (/amazon|mercado\s*livre|magalu|americanas|shopee|aliexpress/.test(desc)) {
    return { categoryId: 'compras', subcategoryId: 'compras-online' }
  }
  
  // Income patterns
  if (/salario|pagamento|deposito|transferencia\s*recebida|pix\s*recebido|ted\s*recebido/.test(desc)) {
    return { categoryId: 'rendas', subcategoryId: 'rendas-salario' }
  }
  
  // Default
  return { categoryId: 'outros', subcategoryId: null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Client with user's auth for RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    
    // Admin client for operations that need to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub as string

    // Get request data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const importType = formData.get('importType') as string // 'bank_statement' or 'credit_card_invoice'
    const sourceId = formData.get('sourceId') as string
    const invoiceMonth = formData.get('invoiceMonth') as string | null // YYYY-MM for credit cards

    if (!file || !importType || !sourceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: file, importType, sourceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's family
    const { data: familyMember, error: familyError } = await supabaseUser
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .single()

    if (familyError || !familyMember) {
      return new Response(
        JSON.stringify({ error: 'Family not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const familyId = familyMember.family_id

    // Determine file type
    const fileName = file.name.toLowerCase()
    let fileType: string
    if (fileName.endsWith('.ofx')) fileType = 'ofx'
    else if (fileName.endsWith('.xls')) fileType = 'xls'
    else if (fileName.endsWith('.xlsx')) fileType = 'xlsx'
    else if (fileName.endsWith('.pdf')) fileType = 'pdf'
    else {
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Use OFX, XLS, XLSX, or PDF.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabaseAdmin
      .from('imports')
      .insert({
        family_id: familyId,
        file_name: file.name,
        file_type: fileType,
        import_type: importType,
        source_id: sourceId,
        invoice_month: invoiceMonth ? `${invoiceMonth}-01` : null,
        status: 'processing',
        created_by: userId,
      })
      .select()
      .single()

    if (importError) {
      console.error('Error creating import record:', importError)
      return new Response(
        JSON.stringify({ error: 'Failed to create import record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upload file to storage
    const storagePath = `${familyId}/${importRecord.id}/${file.name}`
    const fileBuffer = await file.arrayBuffer()
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('financial_imports')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      await supabaseAdmin.from('imports').update({
        status: 'failed',
        error_message: 'Failed to upload file',
      }).eq('id', importRecord.id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update storage path
    await supabaseAdmin.from('imports').update({
      storage_path: storagePath,
    }).eq('id', importRecord.id)

    // Read and parse file content
    let content: string
    try {
      const decoder = new TextDecoder('utf-8')
      content = decoder.decode(fileBuffer)
    } catch {
      // Try latin1 encoding for some OFX files
      const decoder = new TextDecoder('iso-8859-1')
      content = decoder.decode(fileBuffer)
    }

    // Parse transactions based on file type
    let parsedTransactions: ParsedTransaction[] = []
    let needsReview = false
    
    try {
      if (fileType === 'ofx') {
        parsedTransactions = parseOFX(content)
      } else if (fileType === 'xls' || fileType === 'xlsx') {
        // For real XLS/XLSX, we'd need a library. For now, try text parsing
        parsedTransactions = parseXLS(content)
        needsReview = true
      } else if (fileType === 'pdf') {
        // Use AI-powered PDF parsing for better accuracy
        parsedTransactions = await parsePDFWithAI(content)
        needsReview = true
      }
    } catch (parseError) {
      console.error('Error parsing file:', parseError)
      await supabaseAdmin.from('imports').update({
        status: 'failed',
        error_message: 'Failed to parse file content',
        processed_at: new Date().toISOString(),
      }).eq('id', importRecord.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse file. Try using OFX format for better results.',
          importId: importRecord.id,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (parsedTransactions.length === 0) {
      await supabaseAdmin.from('imports').update({
        status: 'failed',
        error_message: 'No transactions found in file',
        processed_at: new Date().toISOString(),
      }).eq('id', importRecord.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'No transactions found in file',
          importId: importRecord.id,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicates in existing transactions
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: existingTransactions } = await supabaseAdmin
      .from('transactions')
      .select('date, amount, type')
      .eq('family_id', familyId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

    const existingSet = new Set<string>()
    ;(existingTransactions || []).forEach(tx => {
      const key = `${tx.date}|${tx.amount}|${tx.type}`
      existingSet.add(key)
    })

    // Filter duplicates and prepare transactions for insertion
    let duplicatesSkipped = 0
    const transactionsToInsert = parsedTransactions
      .map(tx => {
        const category = detectCategory(tx.description)
        
        // For credit card invoices, use the invoice month as the transaction date
        // but keep the original date in original_date field
        let transactionDate = tx.date
        let originalDate: string | null = null
        
        if (importType === 'credit_card_invoice' && invoiceMonth) {
          originalDate = tx.date
          transactionDate = `${invoiceMonth}-01` // First day of invoice month
        }
        
        // Check for duplicate
        const key = `${transactionDate}|${tx.amount}|${tx.type}`
        const isDuplicate = existingSet.has(key)
        
        return {
          data: {
            family_id: familyId,
            type: tx.type,
            amount: tx.amount,
            date: transactionDate,
            original_date: originalDate,
            description: tx.description.substring(0, 255),
            notes: tx.memo?.substring(0, 500),
            category_id: category.categoryId,
            subcategory_id: category.subcategoryId,
            payment_method: importType === 'credit_card_invoice' ? 'credit' : 'debit',
            bank_account_id: importType === 'bank_statement' ? sourceId : null,
            credit_card_id: importType === 'credit_card_invoice' ? sourceId : null,
            import_id: importRecord.id,
            is_recurring: false,
          },
          isDuplicate,
        }
      })
      .filter(tx => {
        if (tx.isDuplicate) {
          duplicatesSkipped++
          return false
        }
        return true
      })
      .map(tx => tx.data)

    // Handle case where all transactions were duplicates
    if (transactionsToInsert.length === 0) {
      await supabaseAdmin.from('imports').update({
        status: 'completed',
        transactions_count: 0,
        processed_at: new Date().toISOString(),
        error_message: `Todas as ${duplicatesSkipped} transações já existiam no sistema.`,
      }).eq('id', importRecord.id)
      
      return new Response(
        JSON.stringify({
          success: true,
          importId: importRecord.id,
          transactionsCount: 0,
          duplicatesSkipped,
          needsReview: false,
          message: `Nenhuma transação nova encontrada. ${duplicatesSkipped} duplicatas ignoradas.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert transactions
    const { data: insertedTransactions, error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert(transactionsToInsert)
      .select('id')

    if (insertError) {
      console.error('Error inserting transactions:', insertError)
      await supabaseAdmin.from('imports').update({
        status: 'failed',
        error_message: 'Failed to save transactions',
        processed_at: new Date().toISOString(),
      }).eq('id', importRecord.id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to save transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update import record - always set to review_needed so user can confirm
    await supabaseAdmin.from('imports').update({
      status: 'review_needed',
      transactions_count: insertedTransactions?.length || 0,
      processed_at: new Date().toISOString(),
    }).eq('id', importRecord.id)

    const duplicateMessage = duplicatesSkipped > 0 
      ? ` (${duplicatesSkipped} duplicata(s) ignorada(s))`
      : ''

    return new Response(
      JSON.stringify({
        success: true,
        importId: importRecord.id,
        transactionsCount: insertedTransactions?.length || 0,
        duplicatesSkipped,
        needsReview: true,
        message: `${insertedTransactions?.length} transações importadas${duplicateMessage}. Revise antes de confirmar.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing import:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
