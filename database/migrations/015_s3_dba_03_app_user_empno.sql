-- S3-DBA-03 (#131): Link app_user.empno to employee(empno)

ALTER TABLE public.app_user
    ADD COLUMN IF NOT EXISTS empno character varying(5);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'app_user_empno_fkey'
          AND conrelid = 'public.app_user'::regclass
    ) THEN
        ALTER TABLE public.app_user
            ADD CONSTRAINT app_user_empno_fkey
            FOREIGN KEY (empno)
            REFERENCES public.employee (empno)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_app_user_empno
    ON public.app_user (empno);