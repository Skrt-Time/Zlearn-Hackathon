# Covenant Project

**Blockchain-native SaaS for privacy-preserving loan covenant compliance via zero-knowledge proofs on Aleo**

---

## Table of Contents

1. [Overview](#overview)  
2. [Goals of the App](#goals-of-the-app)  
3. [Architecture & Workflow](#architecture--workflow)  
4. [Database Schema](#database-schema)  
5. [Setup & Installation](#setup--installation)  
   - [1. Clone the Repository](#1-clone-the-repository)  
   - [2. Install Dependencies](#2-install-dependencies)  
   - [3. Environment Variables](#3-environment-variables)  
   - [4. Database Initialization](#4-database-initialization)  
   - [5. Run the App](#5-run-the-app)  
6. [How to Use](#how-to-use)  
   - [Company](#company)  
   - [Validator](#validator)  
   - [Bank (Evaluator)](#bank-evaluator)  
7. [How It Works](#how-it-works)  
8. [Limitations & Next Improvements](#limitations--next-improvements)  
9. [Folder Structure](#folder-structure)  
10. [License & Credits](#license--credits)  

---

## Overview

Welcome to **Covenant Project**. Our application delivers a blockchain-native SaaS that enables borrowers (companies) to prove, and lenders (banks) to verify, loan covenant compliance using zero-knowledge proofs on the Aleo network—without exposing any sensitive financial data. By replacing costly, manual audits with cryptographic validation, we can reduce operational costs by up to 80% and deliver real-time, privacy-preserving compliance for private credit, CLOs, and ESG lending.

---

## Goals of the App

- **Three user roles**:  
  1. **Company**: Creates a single company and uploads an encrypted JSON of its financial data.  
  2. **Validator**: Downloads and validates the encrypted JSON, then forwards evaluation results to the Bank.  
  3. **Bank (Evaluator)**: Receives the evaluation as a zero-knowledge proof, verifies the covenant ratio without ever seeing raw data.  

- **Minimal demo features**:  
  - A Company can create a company profile and upload an encrypted JSON file.  
  - A Validator can download that JSON, validate it, and mark it “validated,” then send evaluation results to a Bank address.  
  - A Bank can connect, request records, and see if any evaluation exists for that account.  

> **Note**: This is a _demo version_ with some security caveats. It only works locally on Aleo’s Testnet Beta. All sensitive data is stored off-chain in Supabase, while permissions and proof flows occur on-chain.

---

## Architecture & Workflow

1. **Off-Chain (Supabase)**  
   - Tables:  
     - `Users`: user profiles and their wallet address.  
     - `Company`: company profiles created by a user.  
     - `Information`: JSON files uploaded by companies (encrypted), plus metadata (`cle_crypte`, `fichier_crypt`, `valide` flag).  

2. **On-Chain (Aleo Testnet Beta)**  
   - **`permission_granthack.aleo`**: Grants a Validator access to decrypt a specific JSON.  
   - **`share_results.aleo`**: Passes the evaluation result (e.g., a signed ratio) from Validator to Bank.  

3. **Flow**:  
   - A Company connects with an Aleo wallet, creates its company (off-chain), uploads an encrypted JSON (off-chain & on-chain: a record containing `doc_id`).  
   - A Validator connects, clicks **Request Records**, downloads the encrypted JSON, decrypts it (off-chain), validates the content manually, then clicks **Validate**. This triggers an on-chain record so the Bank can retrieve evaluation.  
   - The Validator enters the Bank’s Aleo address and evaluation fields (e.g., ratio), then clicks **Share**, which submits an on-chain transaction (`share_results.aleo`) to securely notify the Bank.  
   - The Bank connects, clicks **Request Records** in the **Evaluate** page, and if an evaluation exists, it sees a confirmation on-screen (the proof, without revealing original JSON).

---

## Database Schema

The SQL definition for the Supabase database is stored in `bd.sql`. It includes three tables: `Users`, `Company`, and `Information`. An example schema:

```sql
-- bd.sql

-- 1. Users table
CREATE TABLE IF NOT EXISTS Users (
  id           SERIAL PRIMARY KEY,
  address      TEXT UNIQUE NOT NULL,       -- Aleo wallet address (aleo1...)
  company_id   INT REFERENCES Company(id),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Company table
CREATE TABLE IF NOT EXISTS Company (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  owner_id   INT REFERENCES Users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Information table
CREATE TABLE IF NOT EXISTS Information (
  id            BIGINT PRIMARY KEY,        -- matches pureDocId (numeric)
  name          TEXT NOT NULL,             -- JSON filename
  cle_crypte    TEXT NOT NULL,             -- AES key (Base64)
  fichier_crypt TEXT NOT NULL,             -- encrypted JSON (Base64: IV ∥ ciphertext)
  company_id    INT REFERENCES Company(id),
  valide        BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

> **Note**: Make sure the table names are lowercase if Supabase is case-sensitive. Adjust `BIGINT` for `Information.id` if needed.

---

## Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Skrt-Time/Zlearn-Hackathon.git
cd Zlearn-Hackathon
cd AleoEvaluation
```

### 2. Install Dependencies

We target **React 18.2.0**. Run:

```bash
npm install react@18.2.0 react-dom@18.2.0
npm install
```

> This will install all required packages including `@demox-labs/aleo-wallet-adapter-react` and `@demox-labs/aleo-wallet-adapter-reactui`.

### 3. Environment Variables

Create a file named `.env` at the root (alongside `package.json`). Add your Supabase credentials like :

```env
VITE_SUPABASE_URL=https://djhyjnxjpkicfrvjcuvv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqaHlqbnhqcGtpY2ZydmpjdXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NDA2MTEsImV4cCI6MjA2NDIxNjYxMX0.5pZk-eln1UphPuPsmscpIPfk2OzVtTy2td1sLxHns2o
```

> Replace the above sample values with your own **Supabase project URL** and **Anon Key**.

### 4. Database Initialization

1. Log in to your Supabase dashboard.  
2. Create a new project (or use an existing one).  
3. Open **SQL Editor** → **New Query**.  
4. Copy-paste the contents of `bd.sql` and run it. This will create table (`Information`) with the correct schema.

   ```bash
   # If you prefer CLI:
   psql -h db.yoursupabase.net -U postgres -d postgres -f bd.sql
   ```

4. Verify that your tables exist under **Database → Tables**.

### 5. Run the App

Finally, start the development server:

```bash
npm run dev
```

You should see something like:

```
  VITE v4.0.0  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173/` in your browser. You will need an **Aleo wallet** (Testnet Beta) to interact with the application.

---

## How to Use

> **Important**: This demo runs on Aleo Testnet Beta and uses Supabase for off-chain storage.

### Company

1. **Connect Wallet**: Click the “Connect Wallet” button (Aleo).  
2. **Create Company** (Account page):  
   - Enter your company name.  
   - Click **“Ajouter votre entreprise”**.  
   - Internally, this:  
     - Inserts a row in `Company` (with owner = current user).  
     - Updates your `Users.company_id`.  
3. **Upload JSON** (Account page):  
   - Click **“Cliquez ou glissez un fichier JSON ici”**.  
   - Select a valid JSON file with your financial data.  
   - The front-end:  
     1. Reads the file, validates JSON.  
     2. Encrypts it with AES-GCM (256 bits).  
     3. Exports the AES key (raw) → Base64.  
     4. Inserts a row in `Information`:  
        - `name` = filename  
        - `cle_crypte` = AES-Key (Base64)  
        - `fichier_crypt` = encrypted JSON (Base64)  
        - `valide` = `false`  
   - A new “token” is now available (off-chain + on-chain record will be created when the Validator grants access).

### Validator

1. **Navigate** to **“Validateur”** (Inscription page).  
2. Click **“Request Records”** (in header). Internally, this:  
   1. Calls `requestRecords("permission_granthack.aleo")` on-chain → returns an array of records.  
   2. Sorts descending by the numeric part of `data.doc_id` (e.g. “12345field.private” → `12345`).  
   3. For each record:  
      - Strips `"field.private"` suffix → `pureDocId`.  
      - Strips `".private"` from `data.reader` → `readerRaw`.  
      - Queries Supabase `Information` table for `id = pureDocId` → retrieves `valide` (boolean).  
   4. Builds a local array `tokenRows: TokenRow[]` with (`rawDocId`, `pureDocId`, `readerRaw`, `valide`).  
   5. Updates state to display the table.  
3. **Table Display** (Inscription page)  
   - **ID** column (clickable): clicking downloads the decrypted JSON.  
   - **Company Address** column (clickable): same download behavior.  
   - **Valide** column:  
     - If `valide === false`: shows a **“Valider”** button → pressing it calls `validateRow(rawDocId)`, which updates Supabase to `valide = true` and reloads the table.  
     - If `valide === true`: displays text *“Ce token est déjà validé”*.  
4. Once at least one token is validated, the bottom form (“Envoyer au Hedge Fund”) appears:  
   - **Token validés** (dropdown): lists all `pureDocId` where `valide === true`.  
   - **Adresse Hedge Fund** (text input).  
   - **Nombre** (number input).  
   - **Share** (button): calls on-chain program `share_results.aleo::calcul_event(pureDocId, number, hedgeAddress, validatorAddress)`.  

### Bank (Evaluator)

1. **Navigate** to **“Evaluate”** page (not shown above but similar structure).  
2. Click **“Request Records”**. Internally:  
   - Runs `requestRecords("share_results.aleo")` → returns records of on-chain evaluations.  
   - Sort and show results (for demo, it simply logs or displays on screen if any evaluation exists).  

> For this demo, the Bank sees a confirmation that an evaluation has been performed. No raw ratios or JSON data is revealed on-chain (everything is off-chain, zero-knowledge proofs ensure privacy).

---

## How It Works

1. **Off-Chain Storage (Supabase)**  
   - JSON files (_encrypted_) live in `Information.fichier_crypt` with keys in `Information.cle_crypte`.  
   - The `valide` flag indicates whether a Validator has approved that token.

2. **On-Chain Permissioning (Aleo Records)**  
   - **`permission_granthack.aleo`**:  
     - Issued by the Company when uploading a JSON (client-side).  
     - The Validator runs `requestRecords`, sees available `doc_id` records.  
     - By clicking “Validate,” the Validator issues an on-chain record (with `doc_idfield`) to confirm they have authorized the Company’s JSON.  
   - **`share_results.aleo`**:  
     - Issued by the Validator after validation to share evaluation results (e.g., a ratio) with a Bank address.  
     - Contains `(pureDocId, number, hedgeAddress, validatorAddress)` as inputs.

3. **Encryption Workflow (Client-Side)**  
   1. Company selects JSON →  
   2. Front-end:  
      - Generates random AES-GCM 256-bit key (`CryptoKey`).  
      - Encrypts JSON with that key → concatenates IV ∥ ciphertext → Base64.  
      - Exports AES key (`CryptoKey`) → raw 32-byte buffer → Base64.  
   3. Inserts into Supabase:  
      - `Validate= false`.  
      - `cle_crypte = Base64(AES_Key_Raw)`.  

4. **Decryption (Client-Side)**  
   - Validator clicks ID or Company cell → triggers `decryptTokenJSON(rawDocId)`:  
     1. Query Supabase for `fichier_crypt` and `cle_crypte`.  
     2. Base64 → ArrayBuffer → import AES `CryptoKey`.  
     3. Decrypt with AES-GCM → get raw JSON string → `JSON.parse` → present to user.  

5. **Zero-Knowledge Proofs (Aleo)**  
   - All on-chain calls use the Aleo Testnet Beta.  
   - **`permission_granthack.aleo`** does not reveal any financial data—only the `doc_id` suffixed with `"field"`.  
   - **`share_results.aleo`** carries the evaluation result to the Bank in a privacy-preserving manner.  

---

## Limitations & Next Improvements

- **Demo-level security**:  
  - AES key is stored as Base64 in Supabase (ideally, the AES key should only be on-chain in a record accessible to the Validator).  
  - Validator currently knows both Company data and Bank address—potential collusion risk.  
  - Ratios and numeric fields are handled as integers (no floating-point in Leo language).  
- **Next steps**:  
  1. Move AES key encryption fully on-chain so that only the on-chain record (with key encryption under Validator’s or Bank’s public key) allows decryption.  
  2. Automate ratio computation in Leo code rather than requiring manual JSON inspection.  
  3. Allow Validator to verify data without seeing raw JSON if possible (extend zero-knowledge proofs).  
  4. Harden the demo into a production-ready architecture with secure off-chain key management and privacy-preserving proofs.

---

## Folder Structure

```
Zlearn-Hackathon/
   ├──DemoVideo.MOV
   ├──permission_granterhack/
   ├──AleoEvaluation/
      ├── bd.sql                      # SQL schema for Supabase
      ├── .env                        # Environment variables (Supabase credentials)
      ├── package.json
      ├── vite.config.js    
      ├── permission_grandhack/    
      ├── node_modules/
      ├── public/
      │   └── index.html
      └── src/
         ├── App.tsx
         ├── main.tsx
         ├── pages/
         │   ├── Accueil.tsx
         │   ├── Account.tsx
         │   ├── Inscription.tsx
         │   ├── Evaluate.tsx
         │   └── pages/
         │       ├── Accueil.css
         │       ├── Account.css
         │       ├── Inscription.css
         │       └── GradientBackground.tsx
         └── components/
            └── ...                 # Any shared components
```

---

## License & Credits

- **License**: MIT  
- **Authors**: Your Team Name  
- Built with 🥚 and 🔒 by leveraging the Aleo blockchain and Supabase.  

Thank you for trying out the Covenant Project! For questions or contributions, please open an issue or submit a pull request in this repository.
