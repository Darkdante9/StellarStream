import { createHash } from "crypto";

export interface PaymentProofRecord {
  id: string;
  txHash: string;
  amount: string;
  recipientAddress: string;
  senderAddress: string;
  asset: string;
  createdAt: string;
}

export interface PaymentProofPathStep {
  hash: string;
  side: "left" | "right";
}

export interface PaymentProofResult {
  proofId: string;
  root: string;
  leafHash: string;
  txHash: string;
  createdAt: string;
  proofPath: PaymentProofPathStep[];
}

export interface PaymentProofVerificationResult {
  valid: boolean;
  root: string;
  proofId: string;
  leafHash: string;
}

export class PaymentProofService {
  private readonly proofs = new Map<string, PaymentProofResult>();

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private buildLeaf(payment: PaymentProofRecord): string {
    return this.hash(
      JSON.stringify({
        id: payment.id,
        txHash: payment.txHash,
        amount: payment.amount,
        recipientAddress: payment.recipientAddress,
        senderAddress: payment.senderAddress,
        asset: payment.asset,
        createdAt: payment.createdAt,
      }),
    );
  }

  private buildRoot(leaves: string[]): string {
    if (leaves.length === 0) {
      return this.hash("empty-proof-set");
    }

    let current = leaves.slice();
    while (current.length > 1) {
      const next: string[] = [];
      for (let index = 0; index < current.length; index += 2) {
        const left = current[index];
        const right = current[index + 1] ?? left;
        next.push(this.hash(`${left}:${right}`));
      }
      current = next;
    }

    return current[0];
  }

  private buildMerkleProof(leaves: string[], targetIndex: number): PaymentProofPathStep[] {
    if (leaves.length === 0) {
      return [];
    }

    const path: PaymentProofPathStep[] = [];
    let currentLevel = leaves.slice();
    let currentIndex = targetIndex;

    while (currentLevel.length > 1) {
      const pairIndex = currentIndex % 2;
      const siblingIndex = pairIndex === 0 ? currentIndex + 1 : currentIndex - 1;
      const siblingHash = currentLevel[siblingIndex] ?? currentLevel[currentIndex];

      path.push({
        hash: siblingHash,
        side: pairIndex === 0 ? "right" : "left",
      });

      const nextLevel: string[] = [];
      for (let index = 0; index < currentLevel.length; index += 2) {
        const left = currentLevel[index];
        const right = currentLevel[index + 1] ?? left;
        nextLevel.push(this.hash(`${left}:${right}`));
      }

      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return path;
  }

  async createProof(payment: PaymentProofRecord): Promise<PaymentProofResult> {
    return this.createBatchProofs([payment]).then((proofs) => proofs[0]);
  }

  async createBatchProofs(payments: PaymentProofRecord[]): Promise<PaymentProofResult[]> {
    const leafHashes = payments.map((payment) => this.buildLeaf(payment));
    const root = this.buildRoot(leafHashes);

    return payments.map((payment, index) => {
      const leafHash = leafHashes[index];
      const proofId = this.hash(`${payment.id}:${payment.txHash}:${payment.createdAt}`);
      const proofPath = this.buildMerkleProof(leafHashes, index);
      const result: PaymentProofResult = {
        proofId,
        root,
        leafHash,
        txHash: payment.txHash,
        createdAt: payment.createdAt,
        proofPath,
      };

      this.proofs.set(proofId, result);
      return result;
    });
  }

  async verifyProof(proofId: string): Promise<PaymentProofVerificationResult> {
    const proof = this.proofs.get(proofId);

    if (!proof) {
      return {
        valid: false,
        root: "",
        proofId,
        leafHash: "",
      };
    }

    let computedRoot = proof.leafHash;
    for (const step of proof.proofPath) {
      computedRoot = step.side === "left"
        ? this.hash(`${step.hash}:${computedRoot}`)
        : this.hash(`${computedRoot}:${step.hash}`);
    }

    return {
      valid: computedRoot === proof.root,
      root: proof.root,
      proofId,
      leafHash: proof.leafHash,
    };
  }
}
