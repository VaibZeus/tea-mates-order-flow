/*
  # PhonePe Business Payment Callback Handler
  
  This edge function handles PhonePe payment callbacks and redirects users
  back to the application with payment status.
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:8080'

    if (req.method === 'POST') {
      // Handle POST callback from PhonePe
      const formData = await req.formData()
      const transactionId = formData.get('transactionId')
      const status = formData.get('code')

      // Redirect to frontend with status
      const redirectUrl = `${frontendUrl}/orders?payment=${status}&txn=${transactionId}`
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl
        }
      })
    } else if (req.method === 'GET') {
      // Handle GET callback (fallback)
      const transactionId = url.searchParams.get('transactionId')
      const status = url.searchParams.get('code')

      const redirectUrl = `${frontendUrl}/orders?payment=${status}&txn=${transactionId}`
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl
        }
      })
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Callback processing error:', error)
    
    // Redirect to frontend with error
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:8080'
    const redirectUrl = `${frontendUrl}/orders?payment=error`
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    })
  }
})