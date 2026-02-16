import pymysql
from datetime import date, datetime
from flask import request
from decimal import Decimal

from utils import month_bounds, overlap_days

class DbUtil:
    def __init__(self, config):
        self.config = config 

    def get_connection(self):
        return pymysql.connect(
            host=self.config['host'],
            user=self.config['user'],
#            password=self.config['password'],
            db=self.config['db'],
            cursorclass=pymysql.cursors.Cursor  # or DictCursor if you prefer
        )

    # DB OPS WITH USERS
    # Save a new user
    def save_user(self, name, surname, email, password):
        con = self.get_connection()

        try:
            with con.cursor() as c: 
                c.execute(
                    'INSERT INTO users (name, surname, email, password) VALUES (%s, %s, %s, %s)', (name, surname, email, password)
                )
                con.commit()
                return c.lastrowid
        finally:
            con.close()

    # Search for a user in the users table by email - used for login
    def get_user_by_email(self, email):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                    'SELECT * FROM users WHERE email = %s', (email,)
                )
                row = c.fetchone()
                if row is None:
                    return None
                col_names = [c[0] for c in c.description]
                return dict(zip(col_names, row))
        finally:
            con.close()

    # Search for a user in the users table by id - to load salesPerson names when adding/updating circuits
    def get_salesperson(self):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                    """
                    SELECT id, name, surname FROM users
                    """
                )
                rows = c.fetchall()
                col_names = [c[0] for c in c.description]
                return [dict(zip(col_names, rows)) for rows in rows]
        finally:
            con.close()

    def update_forgotten_pw(self, email, password):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                    'UPDATE users SET password = %s WHERE email = %s', (password, email)
                )
                con.commit()
        finally:
            con.close()
    
    # DB OPS WITH SITES
    # Save a new site
    def save_site(self, site, reference, latitude, longitude, building, street, number, suburb, city, postcode, province):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                    'INSERT INTO sites (site, reference, latitude, longitude, building, street, number, suburb, city, postcode, province) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', 
                    (site, reference, latitude, longitude, building, street, number, suburb, city, postcode, province)
                )
                con.commit()
                return c.lastrowid
        finally:
            con.close()

    # Search if a site already exists in the db before saving it
    def search_site(self, site):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                    'SELECT * FROM sites WHERE site = %s', (site,)
                )
                return c.fetchone()
        finally:
            con.close()
    
    # Search the db for similar sites as searched for on the Sites page
    def search_similar_site(self, query, dict_values):
        con = self.get_connection()
        
        try:
            with con.cursor() as c:
                c.execute(query, dict_values)
                rows = c.fetchall()
                col_names = [c[0] for c in c.description]
                return [dict(zip(col_names, row)) for row in rows]
        finally:
            con.close()
    
    # Search a site to view in the ViewSite page
    def search_site_to_view(self, site):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                    'SELECT * FROM sites WHERE site = %s', (site,)
                )
                row = c.fetchone()
                col_names = [c[0] for c in c.description]
                return dict(zip(col_names, row))
        finally:
            con.close()
        
    # Search sitename to add the site in AddCircuits
    def search_sitename(self, search_term):
        query = """
            SELECT id, site
            FROM sites
            WHERE LOWER(site) LIKE %s
            ORDER BY site ASC
            LIMIT 10;
        """
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(query, (f"%{search_term}%",))
                rows = c.fetchall()
                col_names = [desc[0] for desc in c.description]
                return [dict(zip(col_names, row)) for row in rows]
        finally:
            con.close()
    
    # Delete a site
    def delete_site(self, site):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                    'DELETE FROM sites WHERE site = %s', (site,)
                )
                con.commit()
                return c.rowcount
        finally:
            con.close()
    
    
    # DB OPS WITH CIRCUITS
    # Save a new circuit
    def save_circuit(
    self,
    vendor,
    circuit_type,
    speed,
    circuit_number,
    circuit_owner,
    usage_flag,
    enni,
    vlan,
    start_date,
    contract_term,
    end_date,
    mrc,
    selling_price,
    siteA_id,
    siteB_id,
    comments,
    status,
    doc,
    salesperson_id
):
        conn = self.get_connection()
        try:
            with conn.cursor() as c:
                c.execute("""
                    INSERT INTO circuits (
                        vendor, circuitType, speed, circuitNumber, circuitOwner,
                        usageFlag, enni, vlan, startDate, contractTerm,
                        endDate, mrc, sellingPrice,
                        siteA, siteB, comments, status, doc, salesPerson
                    )
                    VALUES (
                        %s,%s,%s,%s,%s,
                        %s,%s,%s,%s,%s,
                        %s,%s,%s,
                        %s,%s,%s,%s,%s,%s
                    )
                """, (
                    vendor, circuit_type, speed, circuit_number, circuit_owner,
                    usage_flag, enni, vlan, start_date, contract_term,
                    end_date, mrc, selling_price,
                    siteA_id, siteB_id, comments, status, doc, salesperson_id
                ))
                conn.commit()
                return c.lastrowid
        finally:
            conn.close()


    # Search the db for similar circuit as searched for on the Circuits page
    def search_similar_circuit(self, query, dict_values):
        con = self.get_connection()
        
        try:
            with con.cursor() as c:
                c.execute(query, dict_values)
                rows = c.fetchall()
                col_names = [c[0] for c in c.description]
                return [dict(zip(col_names, row)) for row in rows]
        finally:
            con.close()
    
    # Search a circuit to view in the ViewCircuit page
    def search_circuit_to_view(self, circuit_id):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute("""
                    SELECT 
                        circuits.*, 
                        sa.site AS siteA_name, 
                        sb.site AS siteB_name,
                        u.name AS salesPerson_name,
                        u.surname AS salesPerson_surname,
                        CONCAT(u.name, ' ', u.surname) AS salesPerson_fullname
                    FROM circuits
                    JOIN sites sa ON circuits.siteA = sa.id
                    JOIN sites sb ON circuits.siteB = sb.id
                    LEFT JOIN users u ON circuits.salesPerson = u.id
                    WHERE circuits.id = %s
                """, (circuit_id,))
                
                row = c.fetchone()
                if not row:
                    print(f"No circuit found for ID: {circuit_id}")
                    return None

                col_names = [desc[0] for desc in c.description]
                return dict(zip(col_names, row))
        finally:
            con.close()
    
    # Update an existing record in db
    # Edit a circuit
    def update_circuit(self, service_id, **kwargs):
        """
        Edit a service in the database.

        Parameters
        ----------
        service_id : int
            The ID of the service to edit
        **kwargs : dict
            The fields to edit and their new values. The fields must be valid
            columns in the services table.

        Returns
        -------
        int
            The number of rows affected (1 if the update was successful, 0 otherwise)
        """
        con = self.get_connection()
        set_clause = ', '.join([f"{key} = %s" for key in kwargs.keys()])
        values = list(kwargs.values())

        try:
            with con.cursor() as c:
                c.execute(
                    f'UPDATE circuits SET {set_clause} WHERE id = %s',
                    values + [service_id]
                )
                con.commit()
                # print("c.rowcount:", c.rowcount)
                return c.rowcount
        finally:
            con.close()

    def get_all_circuits_grouped_by_vendor_and_type(self):
        con = self.get_connection()

        query = """
            SELECT 
                vendor,
                circuitType,
                COUNT(*) AS count
            FROM circuits
            WHERE vendor IS NOT NULL AND circuitType IS NOT NULL AND status != 'Cancelled'
            GROUP BY vendor, circuitType
            ORDER BY vendor, circuitType
        """

        try:
            with con.cursor() as c:
                c.execute(query)
                rows = c.fetchall()
                col_names = [c[0] for c in c.description]
                return [dict(zip(col_names, row)) for row in rows]
        finally:
            con.close()

    def get_circuits_by_vendor(self, vendor):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute("""
                    SELECT 
                        circuits.*, 
                        sa.site AS siteA_name, 
                        sb.site AS siteB_name 
                    FROM circuits
                    JOIN sites sa ON circuits.siteA = sa.id
                    JOIN sites sb ON circuits.siteB = sb.id
                    WHERE circuits.vendor = %s AND circuits.status != 'Cancelled'
                """, (vendor,))
                rows = c.fetchall()
                col_names = [desc[0] for desc in c.description]
                return [dict(zip(col_names, row)) for row in rows]
        finally:
            con.close()
   
    def fetch_expiring_circuits(self):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute("""
                    SELECT 
                        circuits.id,
                        circuits.circuitNumber,
                        circuits.circuitOwner,
                        circuits.endDate,
                        circuits.status, 
                        sb.site AS siteB_name 
                    FROM circuits
                    JOIN sites sb ON circuits.siteB = sb.id
                    WHERE circuits.status IN ('Active', 'Cancelling')
                        AND endDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 5 MONTH)
                """)
                rows = c.fetchall()
                col_names = [desc[0] for desc in c.description]
                return [dict(zip(col_names, row)) for row in rows]
        finally:
            con.close()

    def fetch_expired_circuits(self):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute("""
                    SELECT 
                        circuits.id,
                        circuits.circuitNumber,
                        circuits.circuitOwner,
                        circuits.endDate,
                        circuits.status,   
                        sb.site AS siteB_name 
                    FROM circuits
                    JOIN sites sb ON circuits.siteB = sb.id
                    WHERE circuits.status IN ('Active', 'Cancelling')
                        AND endDate < CURDATE()
                """)
                rows = c.fetchall()
                col_names = [desc[0] for desc in c.description]
                return [dict(zip(col_names, row)) for row in rows]
        finally:
            con.close()

    def log_action(self, user_id, action, target_table=None, target_id=None, details=None):
        con = self.get_connection()
        
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent')
        timestamp = datetime.now()

        try:
            with con.cursor() as c:
                query = """
                    INSERT INTO user_logs (user_id, action, target_table, target_id, ip_address, user_agent, timestamp, details)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                c.execute(query, (user_id, action, target_table, target_id, ip_address, user_agent, timestamp, details))
                con.commit()
                return c.lastrowid
        finally:
            con.close()

    def view_logs(self):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                query = """
                    SELECT id, user_id, action, target_table, target_id, ip_address, timestamp, details
                    FROM user_logs
                    ORDER BY timestamp DESC
                    LIMIT 100
                """
                c.execute(query)
                logs = c.fetchall()
                col_names = [c[0] for c in c.description]
                return [dict(zip(col_names, log)) for log in logs]
        finally:
            con.close()

#============================================================================================================================================
    # DB OPS WITH COMMISSIONS
#=============================================================================================================================================
    
        
    def get_all_commissions(self):
        """
        Fetch all commission agreements, including:
        - Circuit info (number, vendor, mrc, sellingPrice)
        - Salesperson info
        - Client / site names
        - Commission agreement details
        GP and estimated commission value can be calculated in the frontend.
        """
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:
                c.execute("""
                    SELECT 
                        c.id,
                        c.circuit_id,
                        c.salesperson_id,
                        CONCAT(u.name, ' ', u.surname) AS salesperson_name,
                        cir.circuitNumber,
                        cir.vendor,
                        cir.contractTerm,
                        cir.mrc,
                        cir.sellingPrice,
                        siteA.site AS siteA_name,
                        siteB.site AS siteB_name,
                        c.commission_percentage,
                        c.start_date,
                        c.end_date,
                        c.status,
                        c.notes,
                        c.created_at,
                        c.updated_at
                    FROM commissions c
                    LEFT JOIN users u ON c.salesperson_id = u.id
                    LEFT JOIN circuits cir ON c.circuit_id = cir.id
                    LEFT JOIN sites siteA ON cir.siteA = siteA.id
                    LEFT JOIN sites siteB ON cir.siteB = siteB.id
                    ORDER BY c.created_at DESC
                """)
                results = c.fetchall()

            conn.close()
            return results

        except Exception as e:
            print("Error fetching commissions:", e)
            return []

    def create_commission(self, circuit_id, salesperson_id, commission_percentage=10.00, start_date=None, end_date=None, status='new', notes=None):
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:

                # 1️⃣ Validate circuit exists
                c.execute("""
                    SELECT id
                    FROM circuits
                    WHERE id = %s
                """, (circuit_id,))
                if not c.fetchone():
                    print(f"create_commission: circuit {circuit_id} not found")
                    return False

                # 2️⃣ Expire existing commissions (business rule)
                c.execute("""
                    UPDATE commissions
                    SET status = 'expired', updated_at = NOW()
                    WHERE circuit_id = %s
                    AND status IN ('new', 'pending', 'active')
                """, (circuit_id,))

                # 4️⃣ Insert new commission
                c.execute("""
                    INSERT INTO commissions (
                        circuit_id,
                        salesperson_id,
                        commission_percentage,
                        start_date,
                        end_date,
                        status,
                        notes,
                        created_at,
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    circuit_id,
                    salesperson_id,
                    commission_percentage,
                    start_date,
                    end_date,
                    status,
                    notes
                ))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print("Error creating commission:", e)
            return False

    def get_current_commission(self, circuit_id):
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:
                c.execute("""
                    SELECT *
                    FROM commissions
                    WHERE circuit_id=%s AND status IN ('active', 'pending', 'new')
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (circuit_id,))
                commission = c.fetchone()
            conn.close()
            return commission
        except Exception as e:
            print("Error fetching current commission:", e)
            return None

    def expire_active_commission(self, circuit_id, end_date, notes):
        """
        Expire the active commission for a circuit.
        - Sets status='expired' and end_date to the provided value.
        - Notes can describe the reason (e.g., salesperson change/removal)
        - Does nothing if no active commission exists.
        """
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:

                c.execute("""
                    UPDATE commissions
                    SET status='expired',
                        end_date=%s,
                        notes=%s,
                        updated_at=NOW()
                    WHERE circuit_id=%s AND status != 'expired'
                """, (
                    end_date,
                    notes,
                    circuit_id
                ))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print("Error expiring commission:", e)
            return False
    
    def update_commission_status(self, commission_id, status):
        try:
            conn = self.get_connection()
            with conn.cursor() as c:
                c.execute("""
                    UPDATE commissions
                    SET status=%s,
                        updated_at=NOW()
                    WHERE id=%s
                """, (status, commission_id))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print("Error updating commission status:", e)
            return False

    def get_commission_by_id(self, commission_id):
        """
        Fetch a single commission record by its ID, including:
        - Salesperson name
        - Circuit info (circuitNumber, vendor)
        - Client info (siteB_name)
        Returns a dict or None if not found.
        """
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("""
                    SELECT 
                        c.*,
                        CONCAT(u.name, ' ', u.surname) AS salesperson_name,
                        cir.circuitNumber,
                        cir.vendor,
                        cir.mrc,
                        cir.sellingPrice,
                        cir.contractTerm,
                        cir.siteA,
                        siteA.site AS siteA_name,
                        cir.siteB,
                        siteB.site AS siteB_name,
                        cat.expires_at
                    FROM commissions c
                    LEFT JOIN users u ON c.salesperson_id = u.id
                    LEFT JOIN circuits cir ON c.circuit_id = cir.id
                    LEFT JOIN sites siteA ON cir.siteA = siteA.id
                    LEFT JOIN sites siteB ON cir.siteB = siteB.id
                    LEFT JOIN commission_approval_tokens cat ON cat.commission_id = c.id
                    WHERE c.id = %s
                """, (commission_id,))
                commission = cursor.fetchone()
            conn.close()
            return commission
        except Exception as e:
            print("Error fetching commission:", e)
            return None
        
    def update_commission_on_apply(self, commission_id, percentage, status):
        try:
            conn = self.get_connection()
            with conn.cursor() as c:
                c.execute("""
                    UPDATE commissions
                    SET commission_percentage = %s,
                        status = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (percentage, status, commission_id))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print("Error updating commission on apply:", e)
            return False
        
    def reset_commission(self, commission_id):
        try:
            conn = self.get_connection()
            with conn.cursor() as c:
                c.execute("""
                    UPDATE commissions
                    SET
                        status = 'new',
                        commission_percentage = 10.00,
                        notes = NULL,
                        updated_at = NOW()
                    WHERE id = %s
                    AND status = 'pending'
                """, (commission_id,))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error resetting commission {commission_id}:", e)
            raise

    
    def reset_expired_pending_commissions(self):
        """
        Reset commissions stuck in 'pending' where the approval token expired
        without approval or rejection.
        """
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:

                # 1️⃣ Find pending commissions with expired, unused tokens
                c.execute("""
                    SELECT DISTINCT c.id AS commission_id
                    FROM commissions c
                    INNER JOIN commission_approval_tokens t
                        ON t.commission_id = c.id
                    WHERE c.status = 'pending'
                    AND t.expires_at < NOW()
                    AND t.used_at IS NULL
                """)
                rows = c.fetchall()

                if not rows:
                    conn.close()
                    return 0

                commission_ids = [row["commission_id"] for row in rows]

                # 2️⃣ Reset commissions to 'new'
                c.execute(f"""
                    UPDATE commissions
                    SET status = 'new',
                        updated_at = NOW()
                    WHERE id IN ({','.join(['%s'] * len(commission_ids))})
                """, commission_ids)

                # 3️⃣ Mark tokens as used (expired without action)
                c.execute(f"""
                    UPDATE commission_approval_tokens
                    SET used_at = NOW()
                    WHERE commission_id IN ({','.join(['%s'] * len(commission_ids))})
                    AND used_at IS NULL
                """, commission_ids)

            conn.commit()
            conn.close()
            return len(commission_ids)

        except Exception as e:
            print("Error resetting expired pending commissions:", e)
            return 0
        
    def get_commissions_for_salesperson(self, salesperson_id):
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:
                c.execute("""
                    SELECT 
                        c.id,
                        c.circuit_id,
                        c.salesperson_id,
                        CONCAT(u.name, ' ', u.surname) AS salesperson_name,
                        cir.circuitNumber,
                        cir.vendor,
                        cir.contractTerm,
                        cir.mrc,
                        cir.sellingPrice,
                        siteA.site AS siteA_name,
                        siteB.site AS siteB_name,
                        c.commission_percentage,
                        c.start_date,
                        c.end_date,
                        c.status,
                        c.notes,
                        c.created_at,
                        c.updated_at
                    FROM commissions c
                    LEFT JOIN users u ON c.salesperson_id = u.id
                    LEFT JOIN circuits cir ON c.circuit_id = cir.id
                    LEFT JOIN sites siteA ON cir.siteA = siteA.id
                    LEFT JOIN sites siteB ON cir.siteB = siteB.id
                    WHERE c.salesperson_id = %s
                    ORDER BY c.created_at DESC
                """, (salesperson_id,))

                rows = c.fetchall()

            conn.close()
            return rows

        except Exception as e:
            print("Error fetching salesperson commissions:", e)
            return []



    #=============================================================================================================================================
    # APPROVAL TOKENS
    #=============================================================================================================================================

    def create_commission_approval_token(self, commission_id, token, expires_at):
        conn = self.get_connection()
        with conn.cursor() as c:
            c.execute("""
                INSERT INTO commission_approval_tokens
                    (commission_id, token, expires_at)
                VALUES (%s, %s, %s)
            """, (commission_id, token, expires_at))
        conn.commit()
        conn.close()

    def get_valid_approval_token(self, token):
        conn = self.get_connection()
        with conn.cursor(pymysql.cursors.DictCursor) as c:
            c.execute("""
                SELECT *
                FROM commission_approval_tokens
                WHERE token = %s
                AND used_at IS NULL
                AND expires_at > NOW()
            """, (token,))
            row = c.fetchone()
        conn.close()
        return row
    
    def mark_approval_token_used(self, token):
        conn = self.get_connection()
        with conn.cursor() as c:
            c.execute("""
                UPDATE commission_approval_tokens
                SET used_at = NOW()
                WHERE token = %s
            """, (token,))
        conn.commit()
        conn.close()

#=============================================================================================================================================
# COMMISSION LEDGER ENTRIES
#=============================================================================================================================================
    
    # This function is called in batch_commissions.py to create monthly commission ledger entries
    def create_monthly_commission_ledger_entry(self, commission_id: int, year: int, month: int) -> bool:
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:

                # Month bounds
                period_start, period_end, days_in_month = month_bounds(year, month)

                # Idempotency check
                c.execute("""
                    SELECT 1
                    FROM commission_ledger
                    WHERE commission_id = %s
                    AND entry_type = 'earned'
                    AND period_start = %s
                    AND period_end = %s
                    LIMIT 1
                """, (commission_id, period_start, period_end))

                if c.fetchone():
                    return True  # Already processed

                # Fetch commission + circuit
                c.execute("""
                    SELECT
                        c.id AS commission_id,
                        c.salesperson_id,
                        c.commission_percentage,
                        c.start_date,
                        c.end_date,
                        cir.mrc,
                        cir.sellingPrice
                    FROM commissions c
                    JOIN circuits cir ON c.circuit_id = cir.id
                    WHERE c.id = %s
                    AND c.status = 'active'
                """, (commission_id,))

                row = c.fetchone()
                if not row:
                    return False

                # Determine overlap
                commission_start = row["start_date"]
                commission_end = row["end_date"] or period_end

                active_days = overlap_days(
                    commission_start,
                    commission_end,
                    period_start,
                    period_end
                )

                if active_days == 0:
                    return True  # No accrual for this month

                # Calculations
                monthly_gp = Decimal(row["sellingPrice"]) - Decimal(row["mrc"])

                prorated_gp = (
                    monthly_gp *
                    Decimal(active_days) /
                    Decimal(days_in_month)
                )

                commission_value = (
                    prorated_gp *
                    (Decimal(row["commission_percentage"]) / Decimal("100"))
                ).quantize(Decimal("0.01"))

                # Insert ledger row
                c.execute("""
                    INSERT INTO commission_ledger (
                        commission_id,
                        user_id,
                        period_start,
                        period_end,
                        gp,
                        commission_percentage,
                        active_days,
                        days_in_month,
                        commission_value,
                        entry_type,
                        status,
                        effective_date
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, 'earned', 'pending', %s
                    )
                """, (
                    commission_id,
                    row["salesperson_id"],
                    period_start,
                    period_end,
                    monthly_gp,
                    row["commission_percentage"],
                    active_days,
                    days_in_month,
                    commission_value,
                    period_end
                ))

            conn.commit()
            conn.close()
            return True
        
        except pymysql.err.IntegrityError as e:
            # Duplicate entry - already processed for this commission + month
            return True

        except Exception as e:
            print("Commission accrual error:", e)
            return False
        
    # Called in /api/commissions/earnings_summary
    def get_commissions_earnings_summary(self, user_id=None):
        """
        Query the commission_ledger table and return earnings summary.
        If user_id is provided, filter by that user.
        """
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:
                if user_id:
                    sql = """
                        SELECT 
                            cl.id,
                            cl.commission_id,
                            cl.user_id,
                            u.name AS user_name,
                            u.surname AS user_surname,
                            c.circuitNumber,
                            s.site AS client_name,          
                            cl.period_start,
                            cl.period_end,
                            cl.gp,
                            cl.commission_percentage,
                            cl.active_days,
                            cl.days_in_month,
                            cl.commission_value,
                            cl.created_at,
                            cl.entry_type,
                            cl.status,
                            CASE
                                WHEN EXISTS (
                                    SELECT 1
                                    FROM commission_ledger p
                                    WHERE p.entry_type = 'payment'
                                    AND p.reference_ledger_id = cl.id
                                    AND p.status = 'paid'
                                )
                                THEN 'paid'
                                ELSE cl.status
                            END AS effective_status,
                            cl.effective_date,
                            cl.notes
                        FROM commission_ledger cl
                        LEFT JOIN users u
                            ON cl.user_id = u.id
                        LEFT JOIN commissions cm
                            ON cl.commission_id = cm.id
                        LEFT JOIN circuits c
                            ON cm.circuit_id = c.id
                        LEFT JOIN sites s
                            ON c.siteB = s.id
                        WHERE cl.user_id = %s
                        AND cl.entry_type = 'earned'
                        ORDER BY cl.period_start DESC;
                    """
                    c.execute(sql, (user_id,))
                else:
                    sql = """
                            SELECT 
                                cl.id,
                                cl.commission_id,
                                cl.user_id,
                                u.name AS user_name,
                                u.surname AS user_surname,
                                c.circuitNumber,
                                s.site AS client_name,    
                                cl.period_start,
                                cl.period_end,
                                cl.gp,
                                cl.commission_percentage,
                                cl.active_days,
                                cl.days_in_month,
                                cl.commission_value,
                                cl.created_at,
                                cl.entry_type,
                                cl.status,

                                /* ✅ Effective status override */
                                CASE
                                    WHEN EXISTS (
                                        SELECT 1
                                        FROM commission_ledger p
                                        WHERE p.entry_type = 'payment'
                                        AND p.reference_ledger_id = cl.id
                                        AND p.status = 'paid'
                                    )
                                    THEN 'paid'
                                    ELSE cl.status
                                END AS effective_status,

                                cl.effective_date,
                                cl.notes

                            FROM commission_ledger cl
                            LEFT JOIN users u
                                ON cl.user_id = u.id
                            LEFT JOIN commissions cm
                                ON cl.commission_id = cm.id
                            LEFT JOIN circuits c
                                ON cm.circuit_id = c.id
                            LEFT JOIN sites s
                                ON c.siteB = s.id

                            WHERE cl.entry_type = 'earned'
                            ORDER BY cl.period_start DESC;
                        """

                    c.execute(sql)

                rows = c.fetchall()

                # Normalize types
                summary = []
                for row in rows:
                    summary.append({
                        "id": row["id"],
                        "commission_id": row["commission_id"],
                        "user_id": row["user_id"],
                        "user_name": row.get("user_name"),
                        "user_surname": row.get("user_surname"),
                        "circuit_number": row.get("circuitNumber"),
                        "client_name": row.get("client_name"),
                        "period_start": str(row["period_start"]),
                        "period_end": str(row["period_end"]),
                        "gp": float(row["gp"]),
                        "commission_percentage": float(row["commission_percentage"]),
                        "active_days": row["active_days"],
                        "days_in_month": row["days_in_month"],
                        "commission_value": float(row["commission_value"]),
                        "created_at": str(row["created_at"]),
                        "entry_type": row["entry_type"],
                        "raw_status": row["status"],
                        "effective_status": row["effective_status"],
                        "effective_date": str(row["effective_date"]),
                        "notes": row["notes"],
                    })

                return summary

        except Exception as e:
            raise RuntimeError(f"Database error: {e}")


    # Called in /api/commissions/pay - these are manual payments triggered by admin or finance users, not the automated batch payout  
    def create_commission_payment_entry(self, earned_ledger_id: int, payment_date: date, notes: str = None) -> bool:
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:

                # Fetch earned ledger row
                c.execute("""
                    SELECT *
                    FROM commission_ledger
                    WHERE id = %s
                    AND entry_type = 'earned'
                    AND status IN ('pending', 'approved')
                """, (earned_ledger_id,))

                earned = c.fetchone()
                if not earned:
                    raise ValueError("Earned commission entry not found or not payable")

                # Guard: prevent double payment
                c.execute("""
                    SELECT 1
                    FROM commission_ledger
                    WHERE entry_type = 'payment'
                    AND reference_ledger_id = %s
                    LIMIT 1
                """, (earned_ledger_id,))

                if c.fetchone():
                    raise ValueError("Commission already paid")

                # Insert payment ledger entry
                c.execute("""
                    INSERT INTO commission_ledger (
                        commission_id,
                        user_id,
                        period_start,
                        period_end,
                        gp,
                        commission_percentage,
                        active_days,
                        days_in_month,
                        commission_value,
                        entry_type,
                        status,
                        effective_date,
                        reference_ledger_id,
                        notes
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        'payment', 'paid', %s, %s, %s
                    )
                """, (
                    earned["commission_id"],
                    earned["user_id"],
                    earned["period_start"],
                    earned["period_end"],
                    earned["gp"],
                    earned["commission_percentage"],
                    earned["active_days"],
                    earned["days_in_month"],
                    earned["commission_value"],
                    payment_date,
                    earned["id"],
                    notes
                ))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print("Payment entry error:", e)
            return False
        
    #=============================================================================================================================================
    # BATCH AUTO PAYOUT SUPPORTING FUNCTIONS
    #============================================================================================================================================= 
    def get_unpaid_earned_commissions(self, year, month):
        conn = self.get_connection()
        with conn.cursor(pymysql.cursors.DictCursor) as c:
            c.execute("""
                SELECT e.id
                FROM commission_ledger e
                LEFT JOIN commission_ledger p 
                ON p.reference_ledger_id = e.id 
                AND p.entry_type = 'payment'
                WHERE e.entry_type = 'earned'
                AND YEAR(e.period_end) = %s
                AND MONTH(e.period_end) = %s
                AND p.id IS NULL
            """, (year, month))
            return c.fetchall()
        
    # This is used in batch_commissions_payout.py to generate the payment entries automatically. This is the opposite of the single, manual payout function above.
    def create_commission_payment_entry_batch(self, earned_ledger_id: int, payment_date: date, payout_batch_id: str, notes: str = None):
        """
        Batch auto payout version of manual payment logic.
        Mirrors create_commission_payment_entry exactly + batch_id tagging.
        """

        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:

                # Fetch earned row
                c.execute("""
                    SELECT *
                    FROM commission_ledger
                    WHERE id = %s
                    AND entry_type = 'earned'
                    AND status IN ('pending', 'approved')
                """, (earned_ledger_id,))
                earned = c.fetchone()

                if not earned:
                    raise ValueError(f"Earned entry {earned_ledger_id} not payable")

                # Prevent double payment
                c.execute("""
                    SELECT 1
                    FROM commission_ledger
                    WHERE entry_type = 'payment'
                    AND reference_ledger_id = %s
                    LIMIT 1
                """, (earned_ledger_id,))

                if c.fetchone():
                    raise ValueError(f"Already paid: {earned_ledger_id}")

                # Insert payment row
                c.execute("""
                    INSERT INTO commission_ledger (
                        commission_id,
                        user_id,
                        period_start,
                        period_end,
                        gp,
                        commission_percentage,
                        active_days,
                        days_in_month,
                        commission_value,
                        entry_type,
                        status,
                        effective_date,
                        reference_ledger_id,
                        notes,
                        payout_batch_id
                    )
                    VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        'payment', 'paid', %s, %s, %s, %s
                    )
                """, (
                    earned["commission_id"],
                    earned["user_id"],
                    earned["period_start"],
                    earned["period_end"],
                    earned["gp"],
                    earned["commission_percentage"],
                    earned["active_days"],
                    earned["days_in_month"],
                    earned["commission_value"],
                    payment_date,
                    earned["id"],
                    notes,
                    payout_batch_id
                ))

            conn.commit()
            return True

        except Exception as e:
            print("Batch payment error:", e)
            return False

        finally:
            conn.close()

    #=============================================================================================================================================


    # This returns a summary of all PAID commissions, used in payout summary If user_id is provided, filters by that user.
    def get_commissions_paid_summary(self, user_id=None):
        """
        Return all PAID commission ledger entries.
        If user_id is provided, filter by that user.
        """
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:

                if user_id:
                    sql = """
                        SELECT 
                            cl.id,
                            cl.commission_id,
                            cl.user_id,
                            u.name AS user_name,
                            u.surname AS user_surname,
                            c.circuitNumber,
                            s.site AS client_name,
                            cl.period_start,
                            cl.period_end,
                            cl.gp,
                            cl.commission_percentage,
                            cl.active_days,
                            cl.days_in_month,
                            cl.commission_value,
                            cl.created_at,
                            cl.entry_type,
                            cl.status,
                            cl.effective_date,
                            cl.notes,
                            cl.reference_ledger_id
                        FROM commission_ledger cl
                        LEFT JOIN users u
                            ON cl.user_id = u.id
                        LEFT JOIN commissions cm
                            ON cl.commission_id = cm.id
                        LEFT JOIN circuits c
                            ON cm.circuit_id = c.id
                        LEFT JOIN sites s
                            ON c.siteB = s.id
                        WHERE cl.status = 'paid'
                        AND cl.user_id = %s
                        ORDER BY cl.effective_date DESC;

                    """
                    c.execute(sql, (user_id,))
                else:
                    sql = """
                        SELECT 
                            cl.id,
                            cl.commission_id,
                            cl.user_id,
                            u.name AS user_name,
                            u.surname AS user_surname,
                            c.circuitNumber,
                            s.site AS client_name,
                            cl.period_start,
                            cl.period_end,
                            cl.gp,
                            cl.commission_percentage,
                            cl.active_days,
                            cl.days_in_month,
                            cl.commission_value,
                            cl.created_at,
                            cl.entry_type,
                            cl.status,
                            cl.effective_date,
                            cl.notes,
                            cl.reference_ledger_id
                        FROM commission_ledger cl
                        LEFT JOIN users u
                            ON cl.user_id = u.id
                        LEFT JOIN commissions cm
                            ON cl.commission_id = cm.id
                        LEFT JOIN circuits c
                            ON cm.circuit_id = c.id
                        LEFT JOIN sites s
                            ON c.siteB = s.id
                        WHERE cl.status = 'paid'
                        ORDER BY cl.effective_date DESC;
                    """
                    c.execute(sql)

                rows = c.fetchall()

                summary = []
                for row in rows:
                    summary.append({
                        "id": row["id"],
                        "commission_id": row["commission_id"],
                        "user_id": row["user_id"],
                        "user_name": row.get("user_name"),
                        "user_surname": row.get("user_surname"),
                        "circuit_number": row.get("circuitNumber"),
                        "client_name": row.get("client_name"),
                        "period_start": str(row["period_start"]) if row["period_start"] else None,
                        "period_end": str(row["period_end"]) if row["period_end"] else None,
                        "gp": float(row["gp"]) if row["gp"] is not None else None,
                        "commission_percentage": float(row["commission_percentage"]) if row["commission_percentage"] is not None else None,
                        "active_days": row["active_days"],
                        "days_in_month": row["days_in_month"],
                        "commission_value": float(row["commission_value"]),
                        "created_at": str(row["created_at"]),
                        "entry_type": row["entry_type"],
                        "status": row["status"],
                        "effective_date": str(row["effective_date"]),
                        "notes": row["notes"],
                        "reference_ledger_id": row["reference_ledger_id"],
                    })

                return summary

        except Exception as e:
            raise RuntimeError(f"Database error: {e}")
        
    

    # Automated payout kill switch lookup
    def get_system_setting_bool(self, key: str) -> bool:
        conn = self.get_connection()
        with conn.cursor() as c:
            c.execute("SELECT setting_value FROM system_settings WHERE setting_key = %s", (key,))
            row = c.fetchone()

        if not row:
            return False  # Fail closed

        return row[0].lower() in ("1", "true", "yes", "on")


    #=============================================================================================================================================
    # SYTEM SETTINGS
    #=============================================================================================================================================

    def get_system_setting(self, key: str):
        conn = self.get_connection()
        try:
            with conn.cursor() as c:
                c.execute("SELECT setting_value FROM system_settings WHERE setting_key = %s", (key,))
                row = c.fetchone()
                # print(f"System setting lookup for '{key}': {row[0] if row else 'not found'}")
                # print(row)
                return row[0] if row else None
        finally:
            conn.close()


    def set_system_setting(self, key: str, value: str):
        conn = self.get_connection()
        try:
            with conn.cursor() as c:
                c.execute("""
                    INSERT INTO system_settings (setting_key, setting_value)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
                """, (key, value))
            conn.commit()
        finally:
            conn.close()

    #=============================================================================================================================================








    # def get_commission_balance(self, commission_id: int):
    #     conn = self.get_connection()
    #     with conn.cursor(pymysql.cursors.DictCursor) as c:

    #         c.execute("""
    #             SELECT
    #                 IFNULL(SUM(CASE WHEN entry_type='earned' THEN commission_value END), 0) AS earned,
    #                 IFNULL(SUM(CASE WHEN entry_type='payment' THEN commission_value END), 0) AS paid
    #             FROM commission_ledger
    #             WHERE commission_id = %s
    #         """, (commission_id,))

    #         row = c.fetchone()

    #     conn.close()
    #     return {
    #         "earned": Decimal(row["earned"]),
    #         "paid": Decimal(row["paid"]),
    #         "outstanding": Decimal(row["earned"]) - Decimal(row["paid"])
    #     }

    # def get_user_commission_balance(self, user_id: int):
    #     conn = self.get_connection()
    #     with conn.cursor(pymysql.cursors.DictCursor) as c:
    #         c.execute("""
    #             SELECT
    #                 IFNULL(SUM(CASE WHEN entry_type='earned' THEN commission_value END), 0) AS earned,
    #                 IFNULL(SUM(CASE WHEN entry_type='payment' THEN commission_value END), 0) AS paid
    #             FROM commission_ledger
    #             WHERE user_id = %s
    #         """, (user_id,))

    #         row = c.fetchone()

    #     conn.close()
    #     return {
    #         "earned": Decimal(row["earned"]),
    #         "paid": Decimal(row["paid"]),
    #         "outstanding": Decimal(row["earned"]) - Decimal(row["paid"])
    #     }

    # def create_user_payment_entry(self, user_id: int, amount: Decimal, payment_date: date, payment_method: str, payment_reference: str = None, notes: str = None):
    #     try:
    #         conn = self.get_connection()
    #         with conn.cursor(pymysql.cursors.DictCursor) as c:

    #             c.execute("""
    #                 INSERT INTO commission_ledger (
    #                     user_id,
    #                     commission_id,
    #                     period_start,
    #                     period_end,
    #                     commission_value,
    #                     entry_type,
    #                     status,
    #                     effective_date,
    #                     notes
    #                 ) VALUES (
    #                     %s, NULL, NULL, NULL, %s, 'payment', 'paid', %s, %s
    #                 )
    #             """, (
    #                 user_id,
    #                 amount,
    #                 payment_date,
    #                 notes
    #             ))

    #         conn.commit()
    #         conn.close()
    #         return True

    #     except Exception as e:
    #         print("Payment entry error:", e)
    #         return False

    # def pay_all_pending_for_user(self, user_id, pay_date, notes=None):
    #     """
    #     Pay all pending earned commission ledger entries for a given user.
    #     This creates a payment ledger row and marks the earned entries as paid.
    #     """

    #     conn = self.get_connection()

    #     try:
    #         with conn.cursor(pymysql.cursors.DictCursor) as c:

    #             # 1) Get total pending amount for user
    #             c.execute("""
    #                 SELECT SUM(commission_value) AS total_pending
    #                 FROM commission_ledger
    #                 WHERE user_id = %s
    #                 AND entry_type = 'earned'
    #                 AND status = 'pending'
    #             """, (user_id,))

    #             row = c.fetchone()
    #             total_pending = row["total_pending"] or 0

    #             if total_pending == 0:
    #                 return {"status": "nothing_to_pay", "amount": 0}

    #             # 2) Insert payment row
    #             c.execute("""
    #                 INSERT INTO commission_ledger (
    #                     commission_id,
    #                     user_id,
    #                     period_start,
    #                     period_end,
    #                     gp,
    #                     commission_percentage,
    #                     active_days,
    #                     days_in_month,
    #                     commission_value,
    #                     entry_type,
    #                     status,
    #                     effective_date,
    #                     notes
    #                 ) VALUES (
    #                     NULL, %s, NULL, NULL, NULL, NULL, NULL, NULL, %s,
    #                     'payment', 'paid', %s, %s
    #                 )
    #             """, (
    #                 user_id,
    #                 total_pending,
    #                 pay_date,
    #                 notes
    #             ))

    #             # 3) Mark earned entries as paid
    #             c.execute("""
    #                 UPDATE commission_ledger
    #                 SET status = 'paid'
    #                 WHERE user_id = %s
    #                 AND entry_type = 'earned'
    #                 AND status = 'pending'
    #             """, (user_id,))

    #         conn.commit()

    #         return {"status": "paid", "amount": float(total_pending)}

    #     finally:
    #         conn.close()
