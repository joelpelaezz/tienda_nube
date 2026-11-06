# Experimental migration reference — static manifest

This is an unexecuted experimental copy through `0017`, not a validated baseline. No schema, data, or historical equivalence is asserted. No snapshots are included. The config's schema path points at the current application schema, not a verified 0017 schema; do not use this copy to generate migrations.

Before any future connection or migration, a separately authorized identity preflight is required: verify the intended disposable server/container, endpoint and port, database, user, and write scope; stop on any discrepancy. The historical SQL explicitly references `public`, so changing `search_path` alone is insufficient. The required environment URL only prevents an implicit fallback; it does not prevent access to an arbitrary database. No database was accessed for this artifact.

The config uses `BASELINE_REFERENCE_DATABASE_URL` and the experimental migration directory; its paths are relative to the project root. It throws when the URL is missing or blank.

## Exact changes

- Copy `0001`: remove the `DO` block adding `stock_movements_created_by_users_id_fk`; copy `0002` retains its existing matching FK after `users` is created.
- Copy `0002`: remove duplicate `CREATE TABLE stock_movements`, `products.is_visible` addition, `stock_movements_variant_id_product_variants_id_fk`, and indexes `stock_movements_variant_id_idx` and `stock_movements_created_at_idx`, plus their associated statement breakpoints. These are supplied by `0001`.
- Copy journal: remove entries `0018`, `0019`, and `0020`; retain all fields of entries `0000`–`0017`.
- All remaining copied SQL bytes are unchanged. These observations do not establish that replay will succeed or match any other database.

## SHA-256

Original paths are relative to `src/drizzle/migrations/`; copy paths are relative to `experiments/baseline-reference/migrations/`. `same` in the copy column means the copy SHA-256 is exactly the original value shown on that row.

| Relative path | Original SHA-256 | Copy SHA-256 |
|---|---|---|
| 0000_romantic_stature.sql | 42aef5d3a1953e5f8ff5eed2945f5769125343617fb8c8ab41971ec9000e9ebe | same |
| 0001_add_stock_movements.sql | 08a2df81fc7624c4d8424a5c3999aadfd0e8ea6e9e225aa2115088cc4de72e6c | 0adfc9309fe2c5e35b2d16f12563c5b5c64c5c821bd15bad1b942bd567278aff |
| 0002_left_cassandra_nova.sql | e5fa6f6c50c66c06378d7f1cc412ecf136ec5b4285c54682fd7a72d046dd45f7 | 1cbad3e8486a4e80236345df7075c2ae6a5e76d02533dba09b43ba9a6f07743a |
| 0003_add_variant_id_to_order_items.sql | 0d38fa41a4370c2aeb6c1b81aa9c7377faa867e132d912f6e6a595b3b6a52073 | same |
| 0004_add_contact_messages.sql | 3a805bd72923027d15393ab21dfb9edc4f765d01ef345433e65548fe16842b1a | same |
| 0005_add_newsletter_subscribers.sql | f99e3fc7759d162dc18a0fbd889991176ed75c49dd3c252ffa66f8808885ce32 | same |
| 0006_add_shipping_configuration.sql | 6acb2d742d4c10b6757574915478fe80f42f0d09e7a83db36f42ae3c5ee8b5e1 | same |
| 0007_add_variant_images.sql | 9974f450b72d69f31e895945dc48b10026bc3a1a3faf9fefd17866d14a199acf | same |
| 0008_backfill_variant_type_ids.sql | 24c7033c66688f10eed55e3a51b40870ccf727621ff1a9c76d26076d44ac4cdf | same |
| 0009_backfill_variant_names.sql | 2eab26f06d3ada449046276ae49abf0bdd0badef1ebc32854f0215bdb8eabac3 | same |
| 0010_add_category_position.sql | 67adb9680397890147a40ad06d4a181ef6cdd2f3814974a3cbd5cc276ce4c9c7 | same |
| 0011_migrate_product_categories.sql | d191cfca3d87363ec8b2793766f67e34e8c46f9b9e08e8eaaac65128b2648832 | same |
| 0012_add_product_free_shipping.sql | 9423d07c0185906403ae2ba739ccd83cb5beab7c450765b03de5d95250a6d6c6 | same |
| 0013_add_communication_events.sql | 03b9bb379802bd35b546044148000846c631e14440d16444945fb72859c2f4fb | same |
| 0014_add_variant_offer_price.sql | 1e3844b9a6206a9862221505dc9daef381675e582a042d30ad89090d212933e1 | same |
| 0015_enrich_variant_types.sql | dce4c7c9b8b8082555f16cad59bab437e3018b6418496826273b036ff0508cb9 | same |
| 0016_normalize_product_variant_options.sql | fbec2aa11190520b5c9e52756b5f89afcb8accfa00374fc97b6dc0ab9fb984c1 | same |
| 0017_nosy_kid_colt.sql | 32e406a67a9b3340d5e87a24e75a58a10bd152e2c79df7e4723b55b10ca41d87 | same |
| meta/_journal.json | ebc2a2980bd486f1b78018838d6ceb3c35ec685eac3a3fbd2509b64956e8263d | 7c3f9236fb82827b82aa98cc8199b6ca88e6e8f196a55cfb3495d00bd7cc2dc0 |
