import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AssignOfferRequest {
  offer_id: string;
  category_ids: number[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { offer_id, category_ids }: AssignOfferRequest = await req.json();

    console.log(`Assigning offer ${offer_id} to members in categories:`, category_ids);

    if (!offer_id || !category_ids || category_ids.length === 0) {
      throw new Error('Missing required parameters: offer_id and category_ids');
    }

    // Get all active members in the specified categories
    const { data: members, error: membersError } = await supabaseClient
      .from('members')
      .select('id, selected_offers, category_id')
      .in('category_id', category_ids)
      .eq('is_active', true);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      throw membersError;
    }

    if (!members || members.length === 0) {
      console.log('No active members found in the specified categories');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active members found in the specified categories',
          updated_count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${members.length} members to update`);

    // Update each member's selected_offers array
    let updated_count = 0;
    const errors: any[] = [];

    for (const member of members) {
      const currentOffers = Array.isArray(member.selected_offers) 
        ? member.selected_offers as string[] 
        : [];
      
      // Check if offer is already assigned
      if (currentOffers.includes(offer_id)) {
        console.log(`Offer already assigned to member ${member.id}, skipping`);
        continue;
      }

      // Add the new offer to the array
      const updatedOffers = [...currentOffers, offer_id];

      const { error: updateError } = await supabaseClient
        .from('members')
        .update({ selected_offers: updatedOffers })
        .eq('id', member.id);

      if (updateError) {
        console.error(`Error updating member ${member.id}:`, updateError);
        errors.push({ member_id: member.id, error: updateError.message });
      } else {
        updated_count++;
      }
    }

    console.log(`Successfully updated ${updated_count} members`);

    if (errors.length > 0) {
      console.warn('Some updates failed:', errors);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_count,
        total_members: members.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in assign-offer-to-members function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
