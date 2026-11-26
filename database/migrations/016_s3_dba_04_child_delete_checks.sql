-- S3-DBA-04 (#132): Child-record delete checks for employee, department, and job

CREATE OR REPLACE FUNCTION public.trg_check_children()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_n INT := 0;
BEGIN
    IF NOT (NEW.is_deleted AND NOT OLD.is_deleted) THEN
        RETURN NEW;                                  
    END IF;

    CASE TG_TABLE_NAME
        WHEN 'employee' THEN
            SELECT count(*) INTO v_n FROM (
                SELECT 1 FROM jobhistory WHERE empno = OLD.empno AND NOT is_deleted
                UNION ALL
                SELECT 1 FROM sales      WHERE empno = OLD.empno AND NOT is_deleted) c;
            IF v_n > 0 THEN
                RAISE EXCEPTION 'Cannot delete % row: % active related record(s) still exist.', TG_TABLE_NAME, v_n;
            END IF;
        WHEN 'department' THEN
            SELECT count(*) INTO v_n FROM jobhistory
             WHERE deptcode = OLD.deptcode AND NOT is_deleted;
            IF v_n > 0 THEN
                RAISE EXCEPTION 'Cannot delete department (%): % active job history record(s) still use this department.', OLD.deptcode, v_n;
            END IF;
        WHEN 'job' THEN
            SELECT count(*) INTO v_n FROM jobhistory
             WHERE jobcode = OLD.jobcode AND NOT is_deleted;
            IF v_n > 0 THEN
                RAISE EXCEPTION 'Cannot delete job (%): % active job history record(s) still use this job.', OLD.jobcode, v_n;
            END IF;
        WHEN 'customer' THEN
            SELECT count(*) INTO v_n FROM sales
             WHERE custno = OLD.custno AND NOT is_deleted;
            IF v_n > 0 THEN
                RAISE EXCEPTION 'Cannot delete % row: % active related record(s) still exist.', TG_TABLE_NAME, v_n;
            END IF;
        WHEN 'sales' THEN
            SELECT count(*) INTO v_n FROM (
                SELECT 1 FROM salesdetail WHERE transno = OLD.transno AND NOT is_deleted
                UNION ALL
                SELECT 1 FROM payment     WHERE transno = OLD.transno AND NOT is_deleted) c;
            IF v_n > 0 THEN
                RAISE EXCEPTION 'Cannot delete % row: % active related record(s) still exist.', TG_TABLE_NAME, v_n;
            END IF;
        WHEN 'product' THEN
            SELECT count(*) INTO v_n FROM (
                SELECT 1 FROM salesdetail WHERE prodcode = OLD.prodcode AND NOT is_deleted
                UNION ALL
                SELECT 1 FROM pricehist   WHERE prodcode = OLD.prodcode AND NOT is_deleted) c;
            IF v_n > 0 THEN
                RAISE EXCEPTION 'Cannot delete % row: % active related record(s) still exist.', TG_TABLE_NAME, v_n;
            END IF;
        ELSE
            NULL;                                   
    END CASE;

    RETURN NEW;
END;
$function$;