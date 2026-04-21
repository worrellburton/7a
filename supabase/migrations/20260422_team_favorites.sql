-- Extra profile fields shown on the public Meet Our Team modal:
--   favorite_quote          : short inspirational quote the member likes
--   favorite_seven_arrows   : what they love most about working at 7A
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS favorite_quote text,
  ADD COLUMN IF NOT EXISTS favorite_seven_arrows text;
