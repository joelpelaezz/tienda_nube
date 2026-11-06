UPDATE "product_variants" pv
SET "name" = names.variant_name
FROM (
  SELECT pv2.id,
    string_agg(vo.value, ' / ' ORDER BY option_item.ordinality) AS variant_name
  FROM "product_variants" pv2
  CROSS JOIN LATERAL unnest(pv2."option_ids") WITH ORDINALITY AS option_item(option_id, ordinality)
  INNER JOIN "variant_options" vo ON vo.id = option_item.option_id::integer
  GROUP BY pv2.id
) names
WHERE pv.id = names.id;
