
alter function public.touch_updated_at() set search_path = public;
revoke execute on function public.decrement_stock_on_usage() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
