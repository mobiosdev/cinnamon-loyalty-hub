import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

    console.log('Starting member-offer assignment fix...');

    // Get all active members with their categories
    const { data: members, error: membersError } = await supabaseClient
      .from('members')
      .select('id, selected_offers, category_id, first_name, last_name')
      .eq('is_active', true);

    if (membersError) throw membersError;

    // Get all offer-category mappings
    const { data: offerCategories, error: offerCategoriesError } = await supabaseClient
      .from('offer_categories')
      .select('offer_id, category_id');

    if (offerCategoriesError) throw offerCategoriesError;

    let fixedCount = 0;
    const updates: any[] = [];

    for (const member of members || []) {
      if (!member.category_id) continue;

      const currentOffers = Array.isArray(member.selected_offers) 
        ? member.selected_offers as string[] 
        : [];

      // Get offers that should be assigned based on category
      const categoryOfferIds = offerCategories
        ?.filter(oc => oc.category_id === member.category_id)
        .map(oc => oc.offer_id) || [];

      // Find missing offers
      const missingOffers = categoryOfferIds.filter(
        offerId => !currentOffers.includes(offerId)
      );

      if (missingOffers.length > 0) {
        const updatedOffers = [...currentOffers, ...missingOffers];
        
        const { error: updateError } = await supabaseClient
          .from('members')
          .update({ selected_offers: updatedOffers })
          .eq('id', member.id);

        if (updateError) {
          console.error(`Error updating member ${member.id}:`, updateError);
        } else {
          fixedCount++;
          updates.push({
            member: `${member.first_name} ${member.last_name}`,
            added_offers: missingOffers.length
          });
        }
      }
    }

    console.log(`Fixed ${fixedCount} members`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fixed_count: fixedCount,
        total_members: members?.length || 0,
        updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fix-member-offers function:', error);
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
