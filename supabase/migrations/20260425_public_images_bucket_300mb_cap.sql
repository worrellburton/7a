-- Lift the public-images bucket cap so big marketing videos can land
-- via the new direct-upload (signed-URL) flow on /app/video. The
-- previous null cap inherited the project default (~50 MB), which
-- broke any video over 50 MB even after we routed around Vercel's
-- 4.5 MB function body limit.
--
-- 314572800 bytes = 300 MB. Big enough for typical promo / drone
-- footage, small enough that nobody accidentally uploads a Blu-ray.
update storage.buckets
set file_size_limit = 314572800
where id = 'public-images';
