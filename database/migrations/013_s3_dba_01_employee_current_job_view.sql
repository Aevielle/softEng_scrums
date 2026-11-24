-- S3-DBA-01 (#129): View for each employee's current job, department, and salary

CREATE OR REPLACE VIEW public.v_employee_current_job AS
SELECT DISTINCT ON (e.empno)
    e.empno,
    e.lastname,
    e.firstname,
    jh.jobcode,
    j.jobdesc AS current_job,
    jh.deptcode,
    d.deptname AS current_department,
    jh.salary AS current_salary,
    jh.effdate AS current_effdate
FROM public.employee_active e
JOIN public.jobhistory_active jh
    ON jh.empno = e.empno
   AND jh.effdate <= CURRENT_DATE
LEFT JOIN public.job_active j
    ON j.jobcode = jh.jobcode
LEFT JOIN public.department_active d
    ON d.deptcode = jh.deptcode
ORDER BY e.empno, jh.effdate DESC;

-- Supporting partial index for fast DISTINCT ON (empno) ORDER BY effdate DESC lookup
CREATE INDEX IF NOT EXISTS idx_jobhistory_active_empno_effdate
    ON public.jobhistory (empno, effdate DESC)
    WHERE is_deleted = false;