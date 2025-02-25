import * as bip39 from 'bip39';
import { useCallback } from 'react';

import { useManageAccount } from '@/hooks/useManageAccount';
import { ALL_MAINNET_COINS, DEFAULT_GALLERY_COINS, WalletType } from '@/onChain/wallets/registry';
import { useAccountsMutations } from '@/realm/accounts';
import { useRealmTransaction } from '@/realm/hooks/useRealmTransaction';
import { RealmSettingsKey, useSettingsMutations } from '@/realm/settings';
import { RealmWallet, useWalletsMutations } from '@/realm/wallets';
import { setSeedInKeychain } from '@/secureStore';

export const useImportWallet = () => {
  const { addNewWallet } = useWalletsMutations();
  const { addNewAccount } = useAccountsMutations();
  const { assignENSNameIfPresent } = useManageAccount();
  const { setSettings } = useSettingsMutations();

  const { runInTransaction } = useRealmTransaction();

  const importWallet = useCallback(
    async (seedPhrase: string[]) => {
      const importText = seedPhrase.join(' ');
      let accountCustomName: string = '';

      if (!bip39.validateMnemonic(importText)) {
        return false;
      }

      const seed = await setSeedInKeychain(importText);
      const wallets: Partial<Record<WalletType, RealmWallet>> = {};

      return runInTransaction(async () => {
        for (const type of ALL_MAINNET_COINS) {
          const wallet = addNewWallet({
            type,
            seed,
            accountIdx: 0,
            addToGallery: DEFAULT_GALLERY_COINS.includes(type),
          });
          wallets[type] = wallet;
        }
        const account = addNewAccount({ accountNumber: 0, accountCustomName });
        setSettings(RealmSettingsKey.isWalletBackupDone, true);
        if (wallets.ethereum) {
          assignENSNameIfPresent(account, wallets.ethereum);
        }
        return true;
      });
    },
    [addNewAccount, addNewWallet, assignENSNameIfPresent, runInTransaction, setSettings],
  );

  return { importWallet };
};
