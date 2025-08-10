import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FriendNotificationRequest {
  senderEmail: string;
  senderName?: string;
  recipientEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { senderEmail, senderName, recipientEmail }: FriendNotificationRequest = await req.json();

    console.log(`Sending friend request notification from ${senderEmail} to ${recipientEmail}`);

    const emailResponse = await resend.emails.send({
      from: "JunkPunk <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: "New Friend Request on JunkPunk!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">JunkPunk</h1>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 16px;">You have a new friend request!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              ${senderName || senderEmail} wants to be your friend on JunkPunk and compete in healthy eating challenges together!
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || 'https://lovableproject.com'}" 
                 style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Friend Request
              </a>
            </div>
            <p style="color: #888; font-size: 14px; text-align: center;">
              Join JunkPunk to track your healthy eating habits and compete with friends!
            </p>
          </div>
        </div>
      `,
    });

    console.log("Friend notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-friend-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);