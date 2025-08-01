import React from 'react';
import { Episode } from '../types';
interface CSVUploadProps {
    onFileValidated: (episodes: Episode[]) => void;
    onError: (error: string) => void;
}
export declare const CSVUpload: React.FC<CSVUploadProps>;
export {};
//# sourceMappingURL=CSVUpload.d.ts.map