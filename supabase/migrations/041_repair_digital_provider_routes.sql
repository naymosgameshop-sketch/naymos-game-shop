-- Migration 041: Repair Active Digital Product Package Provider Routes
-- Additive, Non-destructive, Idempotent Data Mapping Repair

DO $$
DECLARE
  v_finshop_id UUID;
  v_byshop_id UUID;
  v_pp_id UUID;
BEGIN
  -- Get provider IDs
  SELECT id INTO v_finshop_id FROM public.providers WHERE code = 'finshop' OR name ILIKE '%finshop%' LIMIT 1;
  SELECT id INTO v_byshop_id FROM public.providers WHERE code = 'byshop' OR name ILIKE '%byshop%' LIMIT 1;

  -- 1. Map FinShop external_product_code 66
  IF v_finshop_id IS NOT NULL THEN
    SELECT id INTO v_pp_id FROM public.provider_products 
    WHERE provider_id = v_finshop_id AND external_product_code = '66' LIMIT 1;
    
    IF v_pp_id IS NOT NULL THEN
      UPDATE public.provider_routes 
      SET provider_product_id = v_pp_id, provider_id = v_finshop_id
      WHERE (route_key = 'route-dig-app-finshop-66' OR route_key ILIKE '%finshop-66%') 
        AND target_type = 'DIGITAL_PRODUCT_PACKAGE';
    END IF;

    -- 2. Map FinShop external_product_code 26
    SELECT id INTO v_pp_id FROM public.provider_products 
    WHERE provider_id = v_finshop_id AND external_product_code = '26' LIMIT 1;
    
    IF v_pp_id IS NOT NULL THEN
      UPDATE public.provider_routes 
      SET provider_product_id = v_pp_id, provider_id = v_finshop_id
      WHERE (route_key = 'route-dig-app-finshop-26' OR route_key ILIKE '%finshop-26%') 
        AND target_type = 'DIGITAL_PRODUCT_PACKAGE';
    END IF;
  END IF;

  -- 3. Map BYShop routes
  IF v_byshop_id IS NOT NULL THEN
    -- code 1
    SELECT id INTO v_pp_id FROM public.provider_products WHERE provider_id = v_byshop_id AND external_product_code = '1' LIMIT 1;
    IF v_pp_id IS NOT NULL THEN
      UPDATE public.provider_routes SET provider_product_id = v_pp_id, provider_id = v_byshop_id
      WHERE (route_key = 'route-dig-app-byshop-1' OR route_key ILIKE '%byshop-1') AND target_type = 'DIGITAL_PRODUCT_PACKAGE';
    END IF;

    -- code 11
    SELECT id INTO v_pp_id FROM public.provider_products WHERE provider_id = v_byshop_id AND external_product_code = '11' LIMIT 1;
    IF v_pp_id IS NOT NULL THEN
      UPDATE public.provider_routes SET provider_product_id = v_pp_id, provider_id = v_byshop_id
      WHERE (route_key = 'route-dig-app-byshop-11' OR route_key ILIKE '%byshop-11%') AND target_type = 'DIGITAL_PRODUCT_PACKAGE';
    END IF;

    -- code 12
    SELECT id INTO v_pp_id FROM public.provider_products WHERE provider_id = v_byshop_id AND external_product_code = '12' LIMIT 1;
    IF v_pp_id IS NOT NULL THEN
      UPDATE public.provider_routes SET provider_product_id = v_pp_id, provider_id = v_byshop_id
      WHERE (route_key = 'route-dig-app-byshop-12' OR route_key ILIKE '%byshop-12%') AND target_type = 'DIGITAL_PRODUCT_PACKAGE';
    END IF;

    -- code 13
    SELECT id INTO v_pp_id FROM public.provider_products WHERE provider_id = v_byshop_id AND external_product_code = '13' LIMIT 1;
    IF v_pp_id IS NOT NULL THEN
      UPDATE public.provider_routes SET provider_product_id = v_pp_id, provider_id = v_byshop_id
      WHERE (route_key = 'route-dig-app-byshop-13' OR route_key ILIKE '%byshop-13%') AND target_type = 'DIGITAL_PRODUCT_PACKAGE';
    END IF;

    -- code 100
    SELECT id INTO v_pp_id FROM public.provider_products WHERE provider_id = v_byshop_id AND external_product_code = '100' LIMIT 1;
    IF v_pp_id IS NOT NULL THEN
      UPDATE public.provider_routes SET provider_product_id = v_pp_id, provider_id = v_byshop_id
      WHERE (route_key = 'route-dig-app-byshop-100' OR route_key ILIKE '%byshop-100%') AND target_type = 'DIGITAL_PRODUCT_PACKAGE';
    END IF;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';
