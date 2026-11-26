-- S3-DBA-02 (#130): Prevent duplicate active (empno, effdate) rows in jobhistory

CREATE UNIQUE INDEX IF NOT EXISTS uq_jobhistory_active_empno_effdate
    ON public.jobhistory (empno, effdate)
    WHERE is_deleted = false;