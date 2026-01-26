-- =====================================================
-- IMPORTED CATEGORIES SYSTEM
-- Stores user-imported categories from spreadsheets
-- with proper source tracking and mapping capabilities
-- =====================================================

-- 1. Create imported_categories table to store categories from user spreadsheets
CREATE TABLE public.imported_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'IMPORTED_SPREADSHEET' CHECK (source IN ('DEFAULT_OIK', 'IMPORTED_SPREADSHEET', 'USER_CUSTOM')),
    type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
    icon TEXT DEFAULT '📁',
    color TEXT DEFAULT 'hsl(var(--muted))',
    is_active BOOLEAN DEFAULT true,
    original_category_name TEXT,
    mapped_to_category_id TEXT,
    import_session_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(family_id, normalized_name)
);

-- 2. Create imported_subcategories table
CREATE TABLE public.imported_subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    imported_category_id UUID NOT NULL REFERENCES public.imported_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    mapped_to_subcategory_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(imported_category_id, normalized_name)
);

-- 3. Create category_import_sessions to track each import decision
CREATE TABLE public.category_import_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    import_type TEXT NOT NULL CHECK (import_type IN ('spreadsheet', 'bank_statement', 'manual')),
    decision TEXT CHECK (decision IN ('keep_imported', 'merge_with_oik', 'replace_with_oik')),
    categories_imported INTEGER DEFAULT 0,
    subcategories_imported INTEGER DEFAULT 0,
    transactions_count INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

-- 4. Create category_reclassification_log for audit trail
CREATE TABLE public.category_reclassification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.category_import_sessions(id),
    old_category_id TEXT,
    old_subcategory_id TEXT,
    new_category_id TEXT,
    new_subcategory_id TEXT,
    reclassification_source TEXT DEFAULT 'user' CHECK (reclassification_source IN ('user', 'auto', 'ai_suggestion')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS on all new tables
ALTER TABLE public.imported_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_reclassification_log ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for imported_categories
CREATE POLICY "Users can view own family imported categories"
    ON public.imported_categories FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can insert own family imported categories"
    ON public.imported_categories FOR INSERT
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can update own family imported categories"
    ON public.imported_categories FOR UPDATE
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can delete own family imported categories"
    ON public.imported_categories FOR DELETE
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- 7. RLS Policies for imported_subcategories
CREATE POLICY "Users can view own family imported subcategories"
    ON public.imported_subcategories FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can insert own family imported subcategories"
    ON public.imported_subcategories FOR INSERT
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can update own family imported subcategories"
    ON public.imported_subcategories FOR UPDATE
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can delete own family imported subcategories"
    ON public.imported_subcategories FOR DELETE
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- 8. RLS Policies for category_import_sessions
CREATE POLICY "Users can view own family import sessions"
    ON public.category_import_sessions FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can insert own family import sessions"
    ON public.category_import_sessions FOR INSERT
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can update own family import sessions"
    ON public.category_import_sessions FOR UPDATE
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- 9. RLS Policies for category_reclassification_log
CREATE POLICY "Users can view own family reclassification log"
    ON public.category_reclassification_log FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can insert own family reclassification log"
    ON public.category_reclassification_log FOR INSERT
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM public.family_members 
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- 10. Create indexes for performance
CREATE INDEX idx_imported_categories_family ON public.imported_categories(family_id);
CREATE INDEX idx_imported_categories_active ON public.imported_categories(family_id, is_active);
CREATE INDEX idx_imported_subcategories_category ON public.imported_subcategories(imported_category_id);
CREATE INDEX idx_category_import_sessions_family ON public.category_import_sessions(family_id);
CREATE INDEX idx_category_reclassification_log_transaction ON public.category_reclassification_log(transaction_id);

-- 11. Add trigger for updated_at
CREATE TRIGGER update_imported_categories_updated_at
    BEFORE UPDATE ON public.imported_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_imported_subcategories_updated_at
    BEFORE UPDATE ON public.imported_subcategories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();