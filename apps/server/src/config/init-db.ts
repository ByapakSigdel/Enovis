/**
 * Database initialization script.
 * Creates the keyspace and all tables for Enovis.
 * Run with: npm run db:init
 */

import { Client } from "cassandra-driver";

const KEYSPACE = process.env.CASSANDRA_KEYSPACE || "enovis";

async function initDB() {
  // Connect without keyspace first to create it
  const client = new Client({
    contactPoints: [process.env.CASSANDRA_HOST || "127.0.0.1"],
    localDataCenter: process.env.CASSANDRA_DC || "datacenter1",
    credentials: {
      username: process.env.CASSANDRA_USER || "cassandra",
      password: process.env.CASSANDRA_PASSWORD || "cassandra",
    },
  });

  try {
    await client.connect();
    console.log("[init-db] Connected to Cassandra");

    // Create keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS ${KEYSPACE}
      WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 1
      }
    `);
    console.log(`[init-db] Keyspace '${KEYSPACE}' ready`);

    // Use keyspace
    await client.execute(`USE ${KEYSPACE}`);

    // ── Users ──────────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY,
        email       TEXT,
        password    TEXT,
        name        TEXT,
        avatar      TEXT,
        mode        TEXT,
        created_at  TIMESTAMP,
        updated_at  TIMESTAMP
      )
    `);

    // Secondary index for email lookup (login)
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)
    `);

    // ── Tasks ──────────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id            UUID,
        user_id       UUID,
        title         TEXT,
        description   TEXT,
        status        TEXT,
        priority      TEXT,
        due_date      TEXT,
        due_time      TEXT,
        category      TEXT,
        completed     BOOLEAN,
        tags          LIST<TEXT>,
        created_at    TIMESTAMP,
        updated_at    TIMESTAMP,
        PRIMARY KEY   (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Calendar Events ────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id              UUID,
        user_id         UUID,
        title           TEXT,
        description     TEXT,
        start_datetime  TIMESTAMP,
        end_datetime    TIMESTAMP,
        all_day         BOOLEAN,
        category        TEXT,
        color           TEXT,
        location        TEXT,
        recurrence      TEXT,
        status          TEXT,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Transactions (Finance) ─────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id              UUID,
        user_id         UUID,
        type            TEXT,
        amount          DOUBLE,
        currency        TEXT,
        category        TEXT,
        date            TEXT,
        merchant        TEXT,
        description     TEXT,
        payment_method  TEXT,
        tags            LIST<TEXT>,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Budgets ────────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS budgets (
        id          UUID,
        user_id     UUID,
        category    TEXT,
        amount      DOUBLE,
        spent       DOUBLE,
        period      TEXT,
        created_at  TIMESTAMP,
        updated_at  TIMESTAMP,
        PRIMARY KEY (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Habits ─────────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS habits (
        id               UUID,
        user_id          UUID,
        name             TEXT,
        description      TEXT,
        icon             TEXT,
        color            TEXT,
        frequency        TEXT,
        tracking_type    TEXT,
        target           DOUBLE,
        current_streak   INT,
        longest_streak   INT,
        category         TEXT,
        archived         BOOLEAN,
        created_at       TIMESTAMP,
        updated_at       TIMESTAMP,
        PRIMARY KEY      (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Habit Completions ──────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS habit_completions (
        habit_id    UUID,
        user_id     UUID,
        date        TEXT,
        completed   BOOLEAN,
        value       DOUBLE,
        note        TEXT,
        created_at  TIMESTAMP,
        PRIMARY KEY ((user_id, habit_id), date)
      ) WITH CLUSTERING ORDER BY (date DESC)
    `);

    // ── Goals ──────────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS goals (
        id            UUID,
        user_id       UUID,
        title         TEXT,
        description   TEXT,
        category      TEXT,
        status        TEXT,
        progress      DOUBLE,
        target_date   TEXT,
        milestones    TEXT,
        created_at    TIMESTAMP,
        updated_at    TIMESTAMP,
        PRIMARY KEY   (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Notes ──────────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id            UUID,
        user_id       UUID,
        title         TEXT,
        content       TEXT,
        notebook      TEXT,
        tags          LIST<TEXT>,
        pinned        BOOLEAN,
        archived      BOOLEAN,
        created_at    TIMESTAMP,
        updated_at    TIMESTAMP,
        PRIMARY KEY   (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Journal Entries ────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id          UUID,
        user_id     UUID,
        date        TEXT,
        mood        INT,
        prompt      TEXT,
        content     TEXT,
        gratitude   LIST<TEXT>,
        created_at  TIMESTAMP,
        updated_at  TIMESTAMP,
        PRIMARY KEY (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Focus Sessions (Timer) ─────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS focus_sessions (
        id          UUID,
        user_id     UUID,
        task        TEXT,
        duration    INT,
        elapsed     INT,
        status      TEXT,
        started_at  TIMESTAMP,
        ended_at    TIMESTAMP,
        created_at  TIMESTAMP,
        PRIMARY KEY (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Health Metrics ─────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS health_metrics (
        id          UUID,
        user_id     UUID,
        type        TEXT,
        value       DOUBLE,
        unit        TEXT,
        date        TEXT,
        notes       TEXT,
        created_at  TIMESTAMP,
        PRIMARY KEY (user_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ═══════════════════════════════════════════════════════════════
    // ENTERPRISE TABLES
    // ═══════════════════════════════════════════════════════════════

    // ── Enterprises (organizations) ────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS enterprises (
        id              UUID PRIMARY KEY,
        name            TEXT,
        slug            TEXT,
        industry        TEXT,
        size            TEXT,
        owner_id        UUID,
        logo            TEXT,
        website         TEXT,
        address         TEXT,
        phone           TEXT,
        settings        TEXT,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP
      )
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_enterprises_owner ON enterprises (owner_id)
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_enterprises_slug ON enterprises (slug)
    `);

    // ── Enterprise Members ─────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS enterprise_members (
        enterprise_id   UUID,
        user_id         UUID,
        role            TEXT,
        department      TEXT,
        title           TEXT,
        status          TEXT,
        invited_by      UUID,
        joined_at       TIMESTAMP,
        PRIMARY KEY     (enterprise_id, user_id)
      )
    `);

    // Lookup: which enterprises does a user belong to?
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_enterprises (
        user_id         UUID,
        enterprise_id   UUID,
        role            TEXT,
        enterprise_name TEXT,
        joined_at       TIMESTAMP,
        PRIMARY KEY     (user_id, enterprise_id)
      )
    `);

    // ── Projects ───────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id                UUID,
        enterprise_id     UUID,
        project_code      TEXT,
        name              TEXT,
        description       TEXT,
        methodology       TEXT,
        project_manager   UUID,
        start_date        TEXT,
        end_date          TEXT,
        status            TEXT,
        budget_type       TEXT,
        estimated_hours   DOUBLE,
        actual_hours      DOUBLE,
        budget_amount     DOUBLE,
        actual_cost       DOUBLE,
        progress          DOUBLE,
        milestones        TEXT,
        tags              LIST<TEXT>,
        created_at        TIMESTAMP,
        updated_at        TIMESTAMP,
        PRIMARY KEY       (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Project Members ────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS project_members (
        project_id      UUID,
        enterprise_id   UUID,
        user_id         UUID,
        role            TEXT,
        added_at        TIMESTAMP,
        PRIMARY KEY     ((enterprise_id, project_id), user_id)
      )
    `);

    // ── Sprints ────────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sprints (
        id              UUID,
        enterprise_id   UUID,
        project_id      UUID,
        name            TEXT,
        goal            TEXT,
        start_date      TEXT,
        end_date        TEXT,
        status          TEXT,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     ((enterprise_id, project_id), id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Project Tasks ──────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id                UUID,
        enterprise_id     UUID,
        project_id        UUID,
        title             TEXT,
        description       TEXT,
        status            TEXT,
        priority          TEXT,
        assigned_to       UUID,
        assigned_by       UUID,
        watchers          LIST<UUID>,
        dependencies      LIST<UUID>,
        estimated_hours   DOUBLE,
        actual_hours      DOUBLE,
        billable          BOOLEAN,
        sprint_id         UUID,
        epic_id           UUID,
        story_points      INT,
        due_date          TEXT,
        category          TEXT,
        tags              LIST<TEXT>,
        comments          TEXT,
        created_at        TIMESTAMP,
        updated_at        TIMESTAMP,
        PRIMARY KEY       ((enterprise_id, project_id), id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Inventory Products ─────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS inventory_products (
        id                UUID,
        enterprise_id     UUID,
        sku               TEXT,
        name              TEXT,
        description       TEXT,
        category          TEXT,
        brand             TEXT,
        variants          TEXT,
        stock_level       INT,
        reorder_point     INT,
        cost_price        DOUBLE,
        selling_price     DOUBLE,
        unit              TEXT,
        location          TEXT,
        status            TEXT,
        primary_supplier  UUID,
        barcode           TEXT,
        tags              LIST<TEXT>,
        created_at        TIMESTAMP,
        updated_at        TIMESTAMP,
        PRIMARY KEY       (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Stock Movements ────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id              UUID,
        enterprise_id   UUID,
        product_id      UUID,
        type            TEXT,
        quantity         INT,
        from_location   TEXT,
        to_location     TEXT,
        date            TEXT,
        reason          TEXT,
        performed_by    UUID,
        created_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Orders ─────────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id                  UUID,
        enterprise_id       UUID,
        order_number        TEXT,
        type                TEXT,
        customer_name       TEXT,
        customer_email      TEXT,
        customer_phone      TEXT,
        customer_address    TEXT,
        items               TEXT,
        subtotal            DOUBLE,
        tax_total           DOUBLE,
        shipping_cost       DOUBLE,
        discount            DOUBLE,
        total_amount        DOUBLE,
        fulfillment_status  TEXT,
        payment_status      TEXT,
        payment_method      TEXT,
        channel             TEXT,
        notes               TEXT,
        shipping_address    TEXT,
        tracking_number     TEXT,
        created_by          UUID,
        created_at          TIMESTAMP,
        updated_at          TIMESTAMP,
        PRIMARY KEY         (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── CRM Contacts ──────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS crm_contacts (
        id              UUID,
        enterprise_id   UUID,
        type            TEXT,
        first_name      TEXT,
        last_name       TEXT,
        email           TEXT,
        phone           TEXT,
        company_name    TEXT,
        company_website TEXT,
        company_size    TEXT,
        source          TEXT,
        status          TEXT,
        lead_score      INT,
        owner           UUID,
        tags            LIST<TEXT>,
        notes           TEXT,
        address         TEXT,
        last_contacted  TIMESTAMP,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── CRM Deals ─────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS crm_deals (
        id                  UUID,
        enterprise_id       UUID,
        deal_name           TEXT,
        contact_id          UUID,
        pipeline_id         UUID,
        stage               TEXT,
        deal_value          DOUBLE,
        probability         INT,
        expected_close_date TEXT,
        status              TEXT,
        products            TEXT,
        owner               UUID,
        notes               TEXT,
        created_at          TIMESTAMP,
        updated_at          TIMESTAMP,
        PRIMARY KEY         (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── CRM Pipelines ─────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS crm_pipelines (
        id              UUID,
        enterprise_id   UUID,
        name            TEXT,
        stages          TEXT,
        is_default      BOOLEAN,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Invoices ──────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id                UUID,
        enterprise_id     UUID,
        invoice_number    TEXT,
        order_id          UUID,
        customer_name     TEXT,
        customer_email    TEXT,
        customer_address  TEXT,
        line_items        TEXT,
        subtotal          DOUBLE,
        tax_amount        DOUBLE,
        discount          DOUBLE,
        total             DOUBLE,
        amount_paid       DOUBLE,
        status            TEXT,
        due_date          TEXT,
        issued_date       TEXT,
        payment_terms     TEXT,
        notes             TEXT,
        created_by        UUID,
        created_at        TIMESTAMP,
        updated_at        TIMESTAMP,
        PRIMARY KEY       (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Invoice Payments ──────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id              UUID,
        enterprise_id   UUID,
        invoice_id      UUID,
        amount          DOUBLE,
        method          TEXT,
        reference       TEXT,
        date            TEXT,
        notes           TEXT,
        created_at      TIMESTAMP,
        PRIMARY KEY     ((enterprise_id, invoice_id), id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Time Clock ────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS time_clock (
        id                UUID,
        enterprise_id     UUID,
        user_id           UUID,
        clock_in_time     TIMESTAMP,
        clock_out_time    TIMESTAMP,
        total_hours       DOUBLE,
        regular_hours     DOUBLE,
        overtime_hours    DOUBLE,
        break_time        DOUBLE,
        work_location     TEXT,
        status            TEXT,
        notes             TEXT,
        approved_by       UUID,
        created_at        TIMESTAMP,
        updated_at        TIMESTAMP,
        PRIMARY KEY       (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // Lookup: time clock entries by user
    await client.execute(`
      CREATE TABLE IF NOT EXISTS time_clock_by_user (
        enterprise_id     UUID,
        user_id           UUID,
        id                UUID,
        clock_in_time     TIMESTAMP,
        clock_out_time    TIMESTAMP,
        total_hours       DOUBLE,
        status            TEXT,
        work_location     TEXT,
        created_at        TIMESTAMP,
        PRIMARY KEY       ((enterprise_id, user_id), id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Leave Requests ────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id              UUID,
        enterprise_id   UUID,
        user_id         UUID,
        type            TEXT,
        start_date      TEXT,
        end_date        TEXT,
        reason          TEXT,
        status          TEXT,
        approved_by     UUID,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Vendors ───────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS vendors (
        id              UUID,
        enterprise_id   UUID,
        name            TEXT,
        contact_name    TEXT,
        email           TEXT,
        phone           TEXT,
        address         TEXT,
        website         TEXT,
        category        TEXT,
        payment_terms   TEXT,
        rating          DOUBLE,
        performance     TEXT,
        status          TEXT,
        notes           TEXT,
        tags            LIST<TEXT>,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Purchase Orders ───────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id              UUID,
        enterprise_id   UUID,
        po_number       TEXT,
        vendor_id       UUID,
        items           TEXT,
        subtotal        DOUBLE,
        tax             DOUBLE,
        total           DOUBLE,
        status          TEXT,
        expected_date   TEXT,
        notes           TEXT,
        created_by      UUID,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Channels (Team Communication) ─────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS channels (
        id              UUID,
        enterprise_id   UUID,
        name            TEXT,
        type            TEXT,
        description     TEXT,
        project_id      UUID,
        created_by      UUID,
        members         LIST<UUID>,
        pinned          BOOLEAN,
        archived        BOOLEAN,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Channel Messages ──────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS channel_messages (
        id              UUID,
        enterprise_id   UUID,
        channel_id      UUID,
        sender_id       UUID,
        sender_name     TEXT,
        content         TEXT,
        type            TEXT,
        parent_id       UUID,
        attachments     TEXT,
        reactions       TEXT,
        edited          BOOLEAN,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     ((enterprise_id, channel_id), created_at, id)
      ) WITH CLUSTERING ORDER BY (created_at DESC, id DESC)
    `);

    // ── Documents ─────────────────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id              UUID,
        enterprise_id   UUID,
        name            TEXT,
        path            TEXT,
        type            TEXT,
        mime_type       TEXT,
        size            BIGINT,
        version         INT,
        versions        TEXT,
        parent_id       UUID,
        uploaded_by     UUID,
        permissions     TEXT,
        tags            LIST<TEXT>,
        description     TEXT,
        status          TEXT,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Finance: Chart of Accounts ────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id              UUID,
        enterprise_id   UUID,
        code            TEXT,
        name            TEXT,
        type            TEXT,
        parent_id       UUID,
        balance         DOUBLE,
        currency        TEXT,
        description     TEXT,
        is_active       BOOLEAN,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Finance: Journal Entries (accounting) ─────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS accounting_entries (
        id              UUID,
        enterprise_id   UUID,
        entry_number    TEXT,
        date            TEXT,
        description     TEXT,
        line_items      TEXT,
        status          TEXT,
        created_by      UUID,
        approved_by     UUID,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    // ── Resource Allocations ──────────────────────────────────────
    await client.execute(`
      CREATE TABLE IF NOT EXISTS resource_allocations (
        id              UUID,
        enterprise_id   UUID,
        user_id         UUID,
        project_id      UUID,
        allocation      DOUBLE,
        start_date      TEXT,
        end_date        TEXT,
        role            TEXT,
        notes           TEXT,
        created_at      TIMESTAMP,
        updated_at      TIMESTAMP,
        PRIMARY KEY     (enterprise_id, id)
      ) WITH CLUSTERING ORDER BY (id DESC)
    `);

    console.log("[init-db] All tables created successfully (individual + enterprise)");
  } catch (err) {
    console.error("[init-db] Error:", err);
    process.exit(1);
  } finally {
    await client.shutdown();
    console.log("[init-db] Done");
  }
}

initDB();
