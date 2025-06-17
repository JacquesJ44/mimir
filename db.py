import pymysql

class DbUtil:
    def __init__(self, config):
        self.config = config 

    def get_connection(self):
        return pymysql.connect(
            host=self.config['host'],
            user=self.config['user'],
            # password=self.config.get('password'),
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

    # Search for a user in the users table
    def get_user_by_email(self, email):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                    'SELECT * FROM users WHERE email = %s', (email,)
                )
                return c.fetchone()
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
    def save_circuit(self, vendor, circuitType, speed, circuitNumber, circuitOwner, enni, vlan, startDate, contractTerm, endDate, mrc, siteA, siteB, comments, status, doc):
        con = self.get_connection()

        try:
            with con.cursor() as c:
                c.execute(
                   'INSERT INTO circuits (vendor, circuitType, speed, circuitNumber, circuitOwner, enni, vlan, startDate, contractTerm, endDate, mrc, siteA, siteB, comments, status, doc) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', 
                    (vendor, circuitType, speed, circuitNumber, circuitOwner, enni, vlan, startDate, contractTerm, endDate, mrc, siteA, siteB, comments, status, doc)
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
                        sb.site AS siteB_name 
                    FROM circuits
                    JOIN sites sa ON circuits.siteA = sa.id
                    JOIN sites sb ON circuits.siteB = sb.id
                    WHERE circuits.id = %s
                """, (circuit_id,))
                
                row = c.fetchone()
                if not row:
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