/*
  # PhonePe Business Payment Initiation
  
  This edge function initiates PhonePe payments using their Business API.
  It creates payment requests and returns payment URLs for users.
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PaymentRequest {
  orderId: string
  amount: number
  customerInfo: {
    name: string
    phone?: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      })
    }

    const { orderId, amount, customerInfo }: PaymentRequest = await req.json()

    // Validate input
    if (!orderId || !amount || !customerInfo?.name) {
      return new Response('Missing required fields', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // PhonePe Business API configuration
    const merchantId = Deno.env.get('PHONEPE_MERCHANT_ID')
    const saltKey = Deno.env.get('PHONEPE_SALT_KEY')
    const saltIndex = Deno.env.get('PHONEPE_SALT_INDEX') || '1'
    const apiEndpoint = Deno.env.get('PHONEPE_API_ENDPOINT') || 'https://api.phonepe.com/apis/hermes'

    if (!merchantId || !saltKey) {
      console.error('PhonePe credentials not configured')
      return new Response('Payment gateway not configured', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Create merchant transaction ID
    const merchantTransactionId = `ORDER_${orderId}_${Date.now()}`
    
    // Prepare payment payload
    const paymentPayload = {
      merchantId,
      merchantTransactionId,
      merchantUserId: `USER_${orderId}`,
      amount: amount * 100, // Convert to paise
      redirectUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/phonepe-callback`,
      redirectMode: 'POST',
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/phonepe-webhook`,
      mobileNumber: customerInfo.phone?.replace(/\D/g, '').slice(-10),
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    }

    // Encode payload
    const base64Payload = btoa(JSON.stringify(paymentPayload))
    
    // Create checksum
    const checksumString = base64Payload + '/pg/v1/pay' + saltKey
    const checksum = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(checksumString))
    const checksumHex = Array.from(new Uint8Array(checksum))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('') + '###' + saltIndex

    // Make API request to PhonePe
    const response = await fetch(`${apiEndpoint}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksumHex
      },
      body: JSON.stringify({
        request: base64Payload
      })
    })

    const result = await response.json()

    if (result.success && result.data?.instrumentResponse?.redirectInfo?.url) {
      // Create payment record in database
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          amount: amount,
          status: 'pending',
          phonepe_transaction_id: merchantTransactionId,
          time_submitted: new Date().toISOString()
        })

      if (paymentError) {
        console.error('Error creating payment record:', paymentError)
        return new Response('Error creating payment record', { 
          status: 500, 
          headers: corsHeaders 
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          paymentUrl: result.data.instrumentResponse.redirectInfo.url,
          merchantTransactionId,
          transactionId: result.data.transactionId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.error('PhonePe API error:', result)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment initiation failed',
          details: result
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Payment initiation error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})