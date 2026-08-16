-- 收藏上限触发器函数：新增收藏后若超 50 条，自动删除最早的收藏
CREATE OR REPLACE FUNCTION enforce_favorites_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  excess_count INTEGER;
BEGIN
  -- 计算超出 50 条的数量
  SELECT COUNT(*) - 50 INTO excess_count
  FROM case_favorites
  WHERE user_id = NEW.user_id;

  -- 如果超出，删除最早的收藏
  IF excess_count > 0 THEN
    DELETE FROM case_favorites
    WHERE id IN (
      SELECT id FROM case_favorites
      WHERE user_id = NEW.user_id
      ORDER BY created_at ASC
      LIMIT excess_count
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 创建触发器：在插入后执行
CREATE TRIGGER trg_enforce_favorites_limit
AFTER INSERT ON case_favorites
FOR EACH ROW
EXECUTE FUNCTION enforce_favorites_limit();;
