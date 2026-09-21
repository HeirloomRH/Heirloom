import { API_BASE, fetchJson } from "../api";

export interface PrivateTrustDetails {
  trustId: number;
  mode: "public" | "private";
  termsHash: string;
  cipherTerms: string;
  cipherLetter: string;
  ladder?: any;
  commitments: Array<{
    commitment: string;
    ciphertext: string;
    blockNumber: number;
  }>;
}

export interface SolvencySummary {
  latestEpoch: {
    epoch_index: number;
    total_shielded_usd: string;
    solvency_proof: string;
  };
  anonymitySetSize: number;
  isSolvent: boolean;
  network: string;
}

export async function fetchPrivateTrust(trustId: string | number): Promise<PrivateTrustDetails> {
  return fetchJson<PrivateTrustDetails>(`${API_BASE}/api/private/trust/${trustId}`);
}

export async function recordPrivateDeposit(params: {
  trustId: number;
  commitment: string;
  ciphertext: string;
  nullifier?: string;
  blockNumber?: number;
}) {
  return fetchJson(`${API_BASE}/api/private/deposit`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function fetchSolvencyProof(): Promise<SolvencySummary> {
  return fetchJson<SolvencySummary>(`${API_BASE}/api/proofs/solvency`);
}

export async function createProvisionAttestation(trustId: number, thresholdAmount: number) {
  return fetchJson(`${API_BASE}/api/attest/provision`, {
    method: "POST",
    body: JSON.stringify({ trustId, thresholdAmount }),
  });
}

export async function fetchAnonymitySetMeter() {
  return fetchJson<{ anonymitySetPool: string; anonymitySetSize: number }>(`${API_BASE}/api/sets/meter`);
}

export async function requestCustodialMigration(params: {
  trustId: number;
  targetMode: "public" | "private";
  grantorSignature: string;
  targetVaultAddress?: string;
  termsHash?: string;
  cipherTerms?: string;
  cipherLetter?: string;
}) {
  return fetchJson(`${API_BASE}/api/migration/migrate`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function fetchMigrationStatus() {
  return fetchJson<{ totalTrusts: number; publicOnChain: number; privateShielded: number; custodialBetaActive: boolean }>(
    `${API_BASE}/api/migration/status`
  );
}
