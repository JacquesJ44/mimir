import pymysql
from datetime import datetime
from flask import request

class DbUtil:
    def __init__(self, config):
        self.config = config 

    def get_connection(self):
        return pymysql.connect(
            host=self.config['host'],
            user=self.config['user'],
            password=self.config['password'],
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
    def save_circuit(self, vendor, circuitType, speed, circuitNumber, circuitOwner, usageFlag, enni, vlan, startDate, contractTerm, endDate, mrc, sellingPrice, siteA, siteB, comments, status, doc, salesPerson):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                   'INSERT INTO circuits (vendor, circuitType, speed, circuitNumber, circuitOwner, usageFlag,enni, vlan, startDate, contractTerm, endDate, mrc, sellingPrice, siteA, siteB, comments, status, doc, salesPerson) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', 
                    (vendor, circuitType, speed, circuitNumber, circuitOwner, usageFlag, enni, vlan, startDate, contractTerm, endDate, mrc, sellingPrice, siteA, siteB, comments, status, doc, salesPerson)
                )
                con.commit()
                return c.lastrowid
        finally:
            con.close()

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

    def upsert_commission(self, circuit_id):
        """
        Insert or update the commission record for a given circuit.
        Initially, commission_percentage and commission_value are NULL.
        """
        try:
            conn = self.get_connection()
            with conn.cursor() as c:
                # 1️⃣ Get circuit details
                c.execute("""
                    SELECT id, mrc, sellingPrice, contractTerm, startDate, salesPerson
                    FROM circuits
                    WHERE id=%s
                """, (circuit_id,))
                row = c.fetchone()
                col_names = [desc[0] for desc in c.description]
                circuit = dict(zip(col_names, row))


                if not circuit:
                    print(f"No circuit found with id {circuit_id}")
                    return False

                # 2️⃣ Check if commission exists
                c.execute("SELECT id FROM commissions WHERE circuit_id=%s", (circuit_id,))
                existing = c.fetchone()

                if existing:
                    # Update circuit info only, leave percentage/value as is
                    c.execute("""
                        UPDATE commissions
                        SET salesperson_id=%s,
                            mrc=%s,
                            selling_price=%s,
                            contract_months=%s,
                            activation_date=%s,
                            status='pending',
                            updated_at=NOW()
                        WHERE circuit_id=%s
                    """, (
                        circuit['salesPerson'],
                        circuit['mrc'],
                        circuit['sellingPrice'],
                        circuit['contractTerm'],
                        circuit['startDate'],
                        circuit_id
                    ))
                else:
                    # Insert commission record with null percentage/value
                    c.execute("""
                        INSERT INTO commissions (
                            circuit_id, salesperson_id,
                            mrc, selling_price,
                            contract_months, activation_date, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, 'pending')
                    """, (
                        circuit['id'],
                        circuit['salesPerson'],
                        circuit['mrc'],
                        circuit['sellingPrice'],
                        circuit['contractTerm'],
                        circuit['startDate']
                    ))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print("Error upserting commission:", e)
            return False

    def set_commission(self, commission_id, percentage):
        """
        Set the commission percentage and calculate commission_value.
        """
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                # Get commission record to calculate GP
                cursor.execute("""
                    SELECT mrc, selling_price
                    FROM commissions
                    WHERE id=%s
                """, (commission_id,))
                record = cursor.fetchone()
                if not record:
                    return False

                gp = record['selling_price'] - record['mrc']
                commission_value = gp * (percentage / 100)

                cursor.execute("""
                    UPDATE commissions
                    SET commission_percentage=%s,
                        commission_value=%s,
                        updated_at=NOW()
                    WHERE id=%s
                """, (percentage, commission_value, commission_id))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print("Error setting commission:", e)
            return False
        
    def get_all_commissions(self):
        try:
            conn = self.get_connection()
            with conn.cursor() as c:
                c.execute("""
                    SELECT 
                        c.id,
                        c.circuit_id,
                        c.salesperson_id,
                        CONCAT(u.name, ' ', u.surname) AS salesperson_name,
                        cir.circuitNumber,
                        cir.vendor,
                        cir.siteA,
                        siteA.site AS siteA_name,
                        cir.siteB,
                        siteB.site AS siteB_name,
                        c.mrc,
                        c.selling_price,
                        c.commission_percentage,
                        c.commission_value,
                        c.gp,
                        c.contract_months,
                        c.activation_date,
                        c.first_payment_date,
                        c.status,
                        c.notes,
                        c.created_at,
                        c.updated_at
                    FROM commissions c
                    LEFT JOIN users u ON c.salesperson_id = u.id
                    LEFT JOIN circuits cir ON c.circuit_id = cir.id
                    LEFT JOIN sites siteA ON cir.siteA = siteA.id
                    LEFT JOIN sites siteB ON cir.siteB = siteB.id
                    ORDER BY c.created_at DESC;
                """)
                results = c.fetchall()
                col_names = [c[0] for c in c.description]
                return [dict(zip(col_names, result)) for result in results]
            
            conn.close()
            return results
        except Exception as e:
            print("Error fetching commissions:", e)
            return []


    def update_commission_on_circuit_change(self, circuit_id):
        """
        When a circuit is updated (MRC, Selling Price, Contract Term, etc.),
        mark the old commission as expired and insert a new one with updated values.
        """
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as c:
                # 1️⃣ Get latest circuit info
                c.execute("""
                    SELECT id, mrc, sellingPrice, contractTerm, startDate, salesPerson
                    FROM circuits
                    WHERE id=%s
                """, (circuit_id,))
                circuit = c.fetchone()
                if not circuit:
                    print(f"No circuit found for update_commission_on_circuit_change({circuit_id})")
                    return False

                # 2️⃣ Fetch current active commission
                c.execute("""
                    SELECT * FROM commissions
                    WHERE circuit_id=%s AND status='active'
                """, (circuit_id,))
                old_commission = c.fetchone()

                if not old_commission:
                    print(f"No active commission found for circuit {circuit_id}, creating a new one...")
                    return self.upsert_commission(circuit_id)

                # 3️⃣ Check if key values changed
                changed = (
                    old_commission['mrc'] != circuit['mrc'] or
                    old_commission['selling_price'] != circuit['sellingPrice'] or
                    old_commission['contract_months'] != circuit['contractTerm']
                )

                if not changed:
                    print(f"No commission-impacting changes detected for circuit {circuit_id}")
                    return True

                # 4️⃣ Expire old commission
                c.execute("""
                    UPDATE commissions
                    SET status='expired', updated_at=NOW(), notes='Expired due to circuit update'
                    WHERE id=%s
                """, (old_commission['id'],))

                # 5️⃣ Recalculate GP & Commission value (reuse percentage)
                gp = circuit['sellingPrice'] - circuit['mrc']
                percentage = old_commission['commission_percentage'] or 0
                commission_value = gp * (percentage / 100) if percentage else 0

                # 6️⃣ Insert new commission record
                c.execute("""
                    INSERT INTO commissions (
                        circuit_id, salesperson_id,
                        mrc, selling_price, gp,
                        commission_percentage, commission_value,
                        contract_months, activation_date,
                        status, notes, created_at, updated_at
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'active','Auto-updated due to circuit changes',NOW(),NOW())
                """, (
                    circuit['id'],
                    circuit['salesPerson'],
                    circuit['mrc'],
                    circuit['sellingPrice'],
                    gp,
                    percentage,
                    commission_value,
                    circuit['contractTerm'],
                    circuit['startDate']
                ))

            conn.commit()
            conn.close()
            print(f"Commission updated successfully for circuit {circuit_id}")
            return True

        except Exception as e:
            print("Error updating commission after circuit change:", e)
            return False

