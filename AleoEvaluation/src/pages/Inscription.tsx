// src/pages/Inscription.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import {
  WalletNotConnectedError,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { supabase } from "../lib/supabase";
import { Transaction } from "@demox-labs/aleo-wallet-adapter-base";

import GradientBackground from "./css/GradientBackground";
import "./css/Inscription.css";

/** ───────────── Helpers Web Crypto ───────────── */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function importAesKeyFromRaw(rawKeyBuffer: ArrayBuffer): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    "raw",
    rawKeyBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
}

async function decryptAesGcmFromBase64(
  ciphertextBase64: string,
  aesKey: CryptoKey
): Promise<string> {
  const combinedBuffer = base64ToArrayBuffer(ciphertextBase64);
  const combinedBytes = new Uint8Array(combinedBuffer);
  const iv = combinedBytes.slice(0, 12);
  const ciphertextBytes = combinedBytes.slice(12);

  const plaintextBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertextBytes.buffer
  );

  return new TextDecoder().decode(plaintextBuffer);
}

function extractNumericDocId(docId: string): bigint {
  const match = /^(\d+)/.exec(docId);
  if (!match) return 0n;
  try {
    return BigInt(match[1]);
  } catch {
    return 0n;
  }
}

function sortRecordsByNumericDocIdDesc<
  T extends { data: { doc_id: string; reader: string } }
>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const numA = extractNumericDocId(a.data.doc_id);
    const numB = extractNumericDocId(b.data.doc_id);
    if (numA < numB) return 1;
    if (numA > numB) return -1;
    return 0;
  });
}

interface TokenRow {
  rawDocId: string;   // ex. "12345field.private"
  pureDocId: string;  // ex. "12345"
  reader: string;     // ex. "aleo1..." sans ".private"
  valide: boolean;    // depuis Supabase
}

export default function Inscription() {
  const { publicKey, connected, requestRecords, requestTransaction } = useWallet();
  const [tokenRows, setTokenRows] = useState<TokenRow[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>(""); // pureDocId
  const [hedgeAddress, setHedgeAddress] = useState<string>("");
  const [numberInput, setNumberInput] = useState<number>(0);
  const [txStatus, setTxStatus] = useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    if (!connected) {
      console.log("🔒 Wallet non connecté, redirection.");
      navigate("/");
    } else {
      console.log("✅ Wallet connecté :", publicKey?.toString());
    }
  }, [connected, navigate, publicKey]);

  const loadTokens = async () => {
    if (!publicKey) {
      alert("Veuillez connecter votre wallet Aleo.");
      return;
    }
    if (!requestRecords) {
      console.error("La fonction requestRecords n'est pas disponible.");
      return;
    }

    try {
      const program = "permission_granthack.aleo";
      const records = await requestRecords(program);
      console.log("📥 Records bruts :", records);

      if (!records || records.length === 0) {
        alert("Aucun token trouvé pour ce programme.");
        setTokenRows([]);
        return;
      }

      const triDesc = sortRecordsByNumericDocIdDesc(records as any);
      console.log("📑 Records triés (décroissant) :", triDesc);

      const rows: TokenRow[] = [];
      for (const rec of triDesc) {
        const rawDocId: string = rec.data.doc_id;
        const pureDocId = rawDocId.endsWith("field.private")
          ? rawDocId.replace(/field\.private$/, "")
          : rawDocId;

        let readerRaw: string = rec.data.reader || "";
        if (readerRaw.endsWith(".private")) {
          readerRaw = readerRaw.replace(/\.private$/, "");
        }

        const { data: infoRow, error: fetchError } = await supabase
          .from("information")
          .select("valide")
          .eq("id", Number(pureDocId))
          .maybeSingle();

        console.log(
          `🔍 Supabase info pour id=${pureDocId} → `,
          { infoRow, fetchError }
        );

        let valide = false;
        if (!fetchError && infoRow) {
          valide = infoRow.valide === true;
        }

        rows.push({ rawDocId, pureDocId, reader: readerRaw, valide });
      }

      console.log("✅ tokenRows finaux :", rows);
      setTokenRows(rows);

      const firstValid = rows.find((r) => r.valide);
      setSelectedToken(firstValid ? firstValid.pureDocId : "");
    } catch (err) {
      console.error("❌ Erreur lors du chargement des tokens :", err);
      alert("Erreur lors du chargement des tokens.");
      setTokenRows([]);
    }
  };

  const decryptTokenJSON = async (rawDocId: string): Promise<object | null> => {
    try {
      let pureIdStr = rawDocId;
      if (pureIdStr.endsWith("field.private")) {
        pureIdStr = pureIdStr.replace(/field\.private$/, "");
      }

      const { data: infoRow, error: fetchError } = await supabase
        .from("information")
        .select("fichier_crypt, cle_crypte")
        .eq("id", Number(pureIdStr))
        .maybeSingle();

      console.log(
        `🔍 Supabase fetch fichier_crypt/cle_crypte pour id=${pureIdStr} → `,
        { infoRow, fetchError }
      );

      if (fetchError || !infoRow || !infoRow.fichier_crypt || !infoRow.cle_crypte) {
        alert("Impossible de lire ou déchiffrer l'enregistrement en base.");
        return null;
      }

      const rawKeyBuffer = base64ToArrayBuffer(infoRow.cle_crypte);
      const aesKey = await importAesKeyFromRaw(rawKeyBuffer);
      const jsonString = await decryptAesGcmFromBase64(
        infoRow.fichier_crypt,
        aesKey
      );

      try {
        return JSON.parse(jsonString);
      } catch (e) {
        console.error("❌ JSON invalide :", e);
        alert("Le contenu déchiffré n'est pas un JSON valide.");
        return null;
      }
    } catch (err) {
      console.error("❌ Erreur dans decryptTokenJSON :", err);
      alert("Erreur lors du déchiffrement.");
      return null;
    }
  };

  const downloadToken = async (rawDocId: string) => {
    const decryptedObj = await decryptTokenJSON(rawDocId);
    if (!decryptedObj) return;

    const pureIdStr = rawDocId.endsWith("field.private")
      ? rawDocId.replace(/field\.private$/, "")
      : rawDocId;
    const jsonString = JSON.stringify(decryptedObj, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `token-${pureIdStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validateRow = async (rawDocId: string) => {
    const pureIdStr = rawDocId.endsWith("field.private")
      ? rawDocId.replace(/field\.private$/, "")
      : rawDocId;

    const { data: existingRow, error: fetchError } = await supabase
      .from("information")
      .select("valide")
      .eq("id", Number(pureIdStr))
      .maybeSingle();

    console.log(
      `🔍 Supabase fetch 'valide' pour id=${pureIdStr} → `,
      { existingRow, fetchError }
    );

    if (fetchError || !existingRow) {
      alert(`Impossible de vérifier l’état en base pour id = ${pureIdStr}.`);
      return;
    }
    if (existingRow.valide) {
      alert("Ce token est déjà validé.");
      return;
    }

    const { error: updateError } = await supabase
      .from("information")
      .update({ valide: true })
      .eq("id", Number(pureIdStr));

    if (updateError) {
      console.error("❌ Erreur Supabase (validation) :", updateError.message);
      alert("Erreur lors de la validation en base : " + updateError.message);
      return;
    }

    alert("Le token a été validé avec succès !");
    await loadTokens();
  };

  const handleShareResult = async () => {
    if (!publicKey) {
      setTxStatus("Wallet non connecté");
      throw new WalletNotConnectedError();
    }
    if (!selectedToken) {
      alert("Veuillez sélectionner un token validé dans la liste.");
      return;
    }
    if (!hedgeAddress) {
      alert("Veuillez saisir l’adresse du hedge fund.");
      return;
    }
    if (numberInput <= 0) {
      alert("Veuillez saisir un nombre valide.");
      return;
    }

    const fee = 50_000;
    const tx = Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.TestnetBeta,
      "share_results.aleo",
      "calcul_event",
      [selectedToken, numberInput.toString(), hedgeAddress, publicKey.toString()],
      fee,
      false
    );

    if (!requestTransaction) {
      setTxStatus("Impossible d'envoyer la transaction : fonction manquante");
      return;
    }

    setTxStatus("Envoi de la transaction en cours…");
    const result = await requestTransaction(tx);
    console.log("✅ Résultat transaction :", result);
    setTxStatus("✅ Transaction envoyée !");
  };

  const handleBack = () => {
    navigate("/Acceuil");
  };

  return (
    <div className="account-page">
      <GradientBackground />

      {/* ─────────── HEADER ─────────── */}
      <header className="insc-header">
        <button className="btn-request" onClick={loadTokens} disabled={!publicKey}>
          Request Records
        </button>
        <button className="btn-home" onClick={handleBack}>
          Home
        </button>
      </header>

      {/* ─────────── TABLEAU DES TOKENS (toujours affiché) ─────────── */}
      <main className="insc-main">
        <table className="token-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Company Address</th>
              <th>Valide</th>
            </tr>
          </thead>
          <tbody>
            {tokenRows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: "12px" }}>
                  Aucun token chargé
                </td>
              </tr>
            ) : (
              tokenRows.map((row) => (
                <tr key={row.rawDocId}>
                  <td
                    className="clickable-cell"
                    onClick={() => downloadToken(row.rawDocId)}
                  >
                    {row.pureDocId}
                  </td>
                  <td
                    className="clickable-cell"
                    onClick={() => downloadToken(row.rawDocId)}
                  >
                    {row.reader}
                  </td>
                  <td>
                    {row.valide ? (
                      <span>Ce token est déjà validé</span>
                    ) : (
                      <button
                        className="btn-validate-row"
                        onClick={() => validateRow(row.rawDocId)}
                      >
                        Valider
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>

      {/* ─────────── FORMULAIRE SHARE (quand au moins un token est validé) ─────────── */}
      {tokenRows.some((r) => r.valide) && (
        <section className="insc-form">
          <h3>Envoyer au Hedge Fund</h3>
          <div className="form-group">
            <label htmlFor="tokenSelect">Token validés :</label>
            <select
              id="tokenSelect"
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
            >
              <option value="">Choisir...</option>
              {tokenRows
                .filter((r) => r.valide)
                .map((r) => (
                  <option key={r.pureDocId} value={r.pureDocId}>
                    {r.pureDocId}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="hedgeAddress">Adresse Hedge Fund&nbsp;:</label>
            <input
              id="hedgeAddress"
              type="text"
              placeholder="aleo1..."
              value={hedgeAddress}
              onChange={(e) => setHedgeAddress(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="numberInput">Nombre&nbsp;:</label>
            <input
              id="numberInput"
              type="number"
              min={1}
              value={numberInput}
              onChange={(e) => setNumberInput(Number(e.target.value))}
            />
          </div>
          <button className="btn-share" onClick={handleShareResult} disabled={!publicKey}>
            Share
          </button>
          {txStatus && <p className="tx-status">{txStatus}</p>}
        </section>
      )}
    </div>
  );
}
