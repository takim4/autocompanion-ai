
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  filter_brand TEXT DEFAULT NULL,
  filter_model TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID, source TEXT, title TEXT, url TEXT,
  brand TEXT, model TEXT, content TEXT, similarity FLOAT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT k.id, k.source, k.title, k.url, k.brand, k.model, k.content,
         1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks k
  WHERE (filter_brand IS NULL OR k.brand ILIKE filter_brand)
    AND (filter_model IS NULL OR k.model ILIKE filter_model)
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;
