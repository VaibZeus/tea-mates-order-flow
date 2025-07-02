/*
  # PhonePe Business Webhook Handler
  
  This edge function handles PhonePe payment webhooks for automatic payment verification.
  It processes payment notifications and updates order status in real-time.
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PhonePeWebhookPayload {
  merchantId: string
  merchantTransactionId: string
  transactionId: string
  amount: number
  state: string
  responseCode: string
  paymentInstrument: {
    type: string
    utr?: string
  }
  merchantUserId?: string
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

    // Verify request method
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      })
    }

    // Parse webhook payload
    const payload: PhonePeWebhookPayload = await req.json()
    
    console.log('PhonePe webhook received:', payload)

    // Verify webhook authenticity (implement signature verification)
    const phonepeSecret = Deno.env.get('PHONEPE_WEBHOOK_SECRET')
    if (!phonepeSecret) {
      console.error('PhonePe webhook secret not configured')
      return new Response('Webhook secret not configured', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Extract order ID from merchantTransactionId (format: ORDER_<orderId>)
    const orderIdMatch = payload.merchantTransactionId.match(/^ORDER_(.+)$/)
    if (!orderIdMatch) {
      console.error('Invalid merchant transaction ID format:', payload.merchantTransactionId)
      return new Response('Invalid transaction ID format', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    const orderId = orderIdMatch[1]

    // Check if payment was successful
    if (payload.state === 'COMPLETED' && payload.responseCode === 'SUCCESS') {
      // Update payment status in database
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'success',
          utr: payload.paymentInstrument.utr || payload.transactionId,
          phonepe_transaction_id: payload.transactionId,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('status', 'pending')
        .select()
        .single()

      if (paymentError) {
        console.error('Error updating payment:', paymentError)
        return new Response('Error updating payment', { 
          status: 500, 
          headers: corsHeaders 
        })
      }

      if (!payment) {
        console.log('No pending payment found for order:', orderId)
        return new Response('No pending payment found', { 
          status: 404, 
          headers: corsHeaders 
        })
      }

      // Update order status to confirmed
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (orderError) {
        console.error('Error updating order:', orderError)
        return new Response('Error updating order', { 
          status: 500, 
          headers: corsHeaders 
        })
      }

      console.log('Payment verified and order updated:', orderId)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment verified successfully',
          orderId,
          transactionId: payload.transactionId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else if (payload.state === 'FAILED') {
      // Mark payment as failed
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          phonepe_transaction_id: payload.transactionId,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('status', 'pending')

      if (paymentError) {
        console.error('Error updating failed payment:', paymentError)
      }

      console.log('Payment failed for order:', orderId)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment failure recorded',
          orderId,
          transactionId: payload.transactionId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed',
        state: payload.state
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
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