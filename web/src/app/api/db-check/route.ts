import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const tableName = process.env.SUPABASE_TEST_TABLE;

    if (!tableName) {
      return NextResponse.json(
        {
          success: false,
          message: "SUPABASE_TEST_TABLE is not configured.",
        },
        { status: 500 }
      );
    }

    // Validate the identifier before passing it to the SDK.
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid test table name configuration.",
        },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Read at most one row; do not modify any records.
    const { error } = await supabase
      .from(tableName)
      .select("*")
      .limit(1);

    if (error) {
      console.error("Supabase read test failed:", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Supabase read test failed.",
          code: error.code,
          hint:
            "Check the table name, schema, API access, and RLS permissions.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection and read test succeeded.",
      table: tableName,
    });
  } catch (error) {
    console.error(
      "Database connection test failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      {
        success: false,
        message: "Database test could not be completed.",
        hint: "Check your environment variables and application logs.",
      },
      { status: 500 }
    );
  }
}