import React from 'react';
import { Episode } from '../types';
interface EpisodeListProps {
    episodes: Episode[];
    onRefresh: () => void;
    onError: (message: string) => void;
}
export declare const EpisodeList: React.FC<EpisodeListProps>;
export {};
//# sourceMappingURL=EpisodeList.d.ts.map