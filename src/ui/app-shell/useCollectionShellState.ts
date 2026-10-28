import { useState } from 'react';
import type { CollaboratorInfoPageRequest } from '../collection/info/CollaboratorInfoShelf';

export function useCollectionShellState() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [collaboratorSwitchOpen, setCollaboratorSwitchOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [infoFullscreenOpen, setInfoFullscreenOpen] = useState(false);
  const [infoPageRequest, setInfoPageRequest] = useState<CollaboratorInfoPageRequest | null>(null);

  return {
    searchOpen,
    setSearchOpen,
    collaboratorSwitchOpen,
    setCollaboratorSwitchOpen,
    detailOpen,
    setDetailOpen,
    infoFullscreenOpen,
    setInfoFullscreenOpen,
    infoPageRequest,
    setInfoPageRequest
  };
}
