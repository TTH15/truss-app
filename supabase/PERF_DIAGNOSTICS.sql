-- =============================================
-- Truss App - Performance Diagnostics
-- Supabase SQL Editor で実行
-- =============================================

-- 1) テーブルサイズ（肥大化の確認）
select
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
from pg_catalog.pg_statio_user_tables
order by pg_total_relation_size(relid) desc;

-- 2) events の画像が data URL か（大容量 payload の原因）
select
  count(*) as total_events,
  count(*) filter (where image is not null and image like 'data:image%') as data_url_images,
  count(*) filter (where image is not null and image like 'http%') as url_images
from events;

-- 3) 画像文字列の平均/最大長
select
  avg(length(image)) filter (where image is not null) as avg_image_len,
  max(length(image)) filter (where image is not null) as max_image_len
from events;

-- 4) 主要読み取りクエリの実行計画
explain analyze select * from events order by date desc;
explain analyze select * from users;
explain analyze select * from event_participants;

-- 5) 参照整合性が削除を詰まらせていないか確認
-- （ON DELETE CASCADE のため通常は child が自動削除される）
select
  e.id as event_id,
  count(distinct ep.id) as participant_rows,
  count(distinct el.id) as like_rows,
  count(distinct gp.id) as gallery_rows
from events e
left join event_participants ep on ep.event_id = e.id
left join event_likes el on el.event_id = e.id
left join gallery_photos gp on gp.event_id = e.id
group by e.id
order by (count(distinct ep.id) + count(distinct el.id) + count(distinct gp.id)) desc
limit 20;

-- 6) （有効なら）pg_stat_statements から遅いクエリを確認
-- extension が無効な環境では失敗することがあります
select
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
from pg_stat_statements
order by total_exec_time desc
limit 20;
