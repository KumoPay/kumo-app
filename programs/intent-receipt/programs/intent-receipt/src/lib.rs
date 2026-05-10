// programs/intent-receipt/src/lib.rs
//
// Kumo — Intent Commitment + Settlement Receipt
//
// Two instructions, ~120 LOC. Anchor 0.31.1.
//
// Why this exists:
//   The actual transfer is settled privately via MagicBlock's Private
//   Ephemeral Rollups (TEE-backed), which is great for confidentiality
//   but means the public chain has no record of the user's intent.
//   We commit a hash of the intent BEFORE going offline, and record
//   the settlement signature AFTER reconnect. This gives auditors a
//   verifiable trail without leaking amounts/recipients.

use anchor_lang::prelude::*;

declare_id!("8ttk7xy5Xyg7FUBeZ5Ztdck6Uwm9RdXoCcxgNoTSR7M6");

#[program]
pub mod intent_receipt {
    use super::*;

    /// Commit the SHA-256 hash of a parsed PaymentIntent on-chain.
    /// Called once, BEFORE going offline (or right after reconnect, before broadcast).
    pub fn commit_intent(ctx: Context<CommitIntent>, intent_hash: [u8; 32]) -> Result<()> {
        let intent = &mut ctx.accounts.intent;
        intent.user = ctx.accounts.user.key();
        intent.intent_hash = intent_hash;
        intent.created_at = Clock::get()?.unix_timestamp;
        intent.settled = false;
        intent.settlement_tx = None;

        emit!(IntentCommitted {
            user: intent.user,
            intent_hash,
            created_at: intent.created_at,
        });
        Ok(())
    }

    /// Record the settlement signature returned by MagicBlock PER (or any
    /// other settlement venue). Called AFTER reconnect, AFTER broadcast.
    pub fn record_settlement(
        ctx: Context<RecordSettlement>,
        settlement_tx: [u8; 64],
    ) -> Result<()> {
        let intent = &mut ctx.accounts.intent;

        require_keys_eq!(intent.user, ctx.accounts.user.key(), IntentError::WrongUser);
        require!(!intent.settled, IntentError::AlreadySettled);

        intent.settled = true;
        intent.settlement_tx = Some(settlement_tx);

        emit!(SettlementRecorded {
            user: intent.user,
            intent_hash: intent.intent_hash,
            settlement_tx,
        });
        Ok(())
    }
}

// --- Accounts ---------------------------------------------------------------

#[derive(Accounts)]
#[instruction(intent_hash: [u8; 32])]
pub struct CommitIntent<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = IntentCommitment::SPACE,
        seeds = [b"intent", user.key().as_ref(), intent_hash.as_ref()],
        bump,
    )]
    pub intent: Account<'info, IntentCommitment>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordSettlement<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"intent", user.key().as_ref(), intent.intent_hash.as_ref()],
        bump,
    )]
    pub intent: Account<'info, IntentCommitment>,
}

// --- State ------------------------------------------------------------------

#[account]
pub struct IntentCommitment {
    pub user: Pubkey,                    // 32
    pub intent_hash: [u8; 32],           // 32
    pub created_at: i64,                 // 8
    pub settled: bool,                   // 1
    pub settlement_tx: Option<[u8; 64]>, // 1 + 64
}

impl IntentCommitment {
    // 8 (discriminator) + 32 + 32 + 8 + 1 + (1 + 64)
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1 + 1 + 64;
}

// --- Events -----------------------------------------------------------------

#[event]
pub struct IntentCommitted {
    pub user: Pubkey,
    pub intent_hash: [u8; 32],
    pub created_at: i64,
}

#[event]
pub struct SettlementRecorded {
    pub user: Pubkey,
    pub intent_hash: [u8; 32],
    pub settlement_tx: [u8; 64],
}

// --- Errors -----------------------------------------------------------------

#[error_code]
pub enum IntentError {
    #[msg("This intent has already been settled.")]
    AlreadySettled,
    #[msg("Only the original committer can record settlement.")]
    WrongUser,
}
