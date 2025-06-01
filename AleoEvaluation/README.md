Welcome in The Covenant Project.
Our project delivers a blockchain-native SaaS that enables borrowers to prove, and lenders to verify, loan covenant compliance through zero-knowledge proofs on Aleo—without exposing any financial data. By replacing costly, manual audits with cryptographic validation, we reduce operational costs by up to 80% and bring real-time, privacy-preserving compliance to private credit, CLOs, and ESG lending.

Goal of the App
The app allow for now has only 3 type of users : a company whose data would be evaluated, a validator who must check the data and validate them and a third actor which could be a Bank or another organisation. For now any user can create one and only one company. When a user have a company he can add a JSON file about his company data and the address of the validor whose role is to validate them.

To validate the data just send, the validator must go in Acceuil/Validator and then download the JSON. He must check the data write on it. Once it's done he can Validate the data and as it is a demo version the Validator will have to write the address of the Bank, with the 2 informations whose ratio the Bank require.

The Bank will juste have to connect and then go to Acceuil/Evaluate and press the button. If this account received an evaluation, it will print on the screen.

How to use it
As it is only a demo versio, it is really raw with some securities issue, for now it only works in local in the TestNetBeta network. We use a separate Data Base to stock the data from the Company, using supabase.

To launch the app, you have to execute : npm install and then npm run dev and then paste http://localhost:5173/ in your favorite brower. You will have to have a wallet aleo to use the app no matter which actor you are.

How does it works
For now, the blockchain Aleo is used only between the validator and the company and between the validator and the Bank. This App Use an Off/On chain model, as the data is stock in an Offchain Data Base and the permission and how to access it are passed through the blockchain using records. The 2 programs are permission_granthack.aleo which allow the access of the validator to the Data and share_results.aleo which pass the result of the evaluation to the Bank with a NFT passed on.

The limit and what you can do.
This demo version require the bare minimum to illustrate how we can use the Aleo Blockchain and the ZK power to tackle the Covenant issue. It does work, as a Bank can check the ratio it requires without ever knowing the 2 data from the ratio.

In this demo, the app is way too much centralised around the Validator but in the final version the only action than the Validator could do is to check and validate the data without knowing the identity of the Bank than need the data. So the Validator should be a trust actor as if it colludes with the company, it could lead to fraud.

Also as Float does not exist in the leo language, the ratio does not entirely work for now as the 2 data are considerer to be field. And when a company post a new Json in the DataBase it is scrypt with a symetrical encryption but the key is stock on the DataBase as it should be on the record pass to the validator which would allow him to decrypt the JSON. This issue is a major security flaw but it would be easily fix.

Next Improvement
The next improvement to make which are necessary is to fix the evaluation of the ratio and to automate some aspect and thus reduce the importance of the validator.

The Data Base
The Data Base is used is host by SupaBase. The File whose acess to the base are : Validor.tsx and Account.tsx with the line import { supabase } from "../lib/supabase".

The DataBase have 3 table called Company, Users and Information. Users stock some public information on users, Company on the company created by the users and Information stock the data post by a company.