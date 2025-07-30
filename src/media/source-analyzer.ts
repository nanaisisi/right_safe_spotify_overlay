export interface SourceAnalysisResult {
    detectedSource: string;
    confidence: number;
    reasons: string[];
    metadataQuality: string;
    rawData?: any;
}

export class SourceAnalyzer {
    
    /**
     * 曲名とアーティスト名から音源を詳細分析
     */
    static analyzeSource(trackName: string, artistName: string, additionalData?: any): SourceAnalysisResult {
        const reasons: string[] = [];
        let confidence = 0;
        let detectedSource = "Unknown";
        let metadataQuality = "Unknown";

        // 基本的なメタデータ品質チェック
        const hasValidTrackName = trackName && trackName.trim() !== "" && trackName !== "Unknown Track";
        const hasValidArtistName = artistName && artistName.trim() !== "" && artistName !== "Unknown Artist";

        if (!hasValidTrackName && !hasValidArtistName) {
            metadataQuality = "Poor";
            reasons.push("楽曲名・アーティスト名が不明");
        } else if (!hasValidTrackName || !hasValidArtistName) {
            metadataQuality = "Fair";
            reasons.push("楽曲名またはアーティスト名が不明");
        } else {
            metadataQuality = "Good";
        }

        // VLCの特徴的なパターンを検出
        const vlcPatterns = [
            // ファイル拡張子
            /\.(mp3|flac|wav|m4a|aac|ogg|wma|opus)$/i,
            // ファイルパス
            /[\\\/]/,
            // VLCの典型的な表示
            /Unknown (Track|Artist)/i,
            // 数字のみの楽曲名（トラック番号など）
            /^\d+$/,
            // 日本語ファイル名の特徴
            /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF].*\.(mp3|flac|wav|m4a|aac|ogg)/i
        ];

        // Spotifyの特徴的なパターンを検出
        const spotifyPatterns = [
            // 一般的な楽曲タイトルの形式
            /^[A-Za-z0-9\s\-\(\)\[\]'",\.!?&]+$/,
            // アーティスト名の形式
            /^[A-Za-z0-9\s\-\(\)\[\]'",\.!?&]+$/,
            // フィーチャリング表記
            /(feat\.|featuring|ft\.)/i,
            // リミックス・バージョン表記
            /(remix|version|mix|edit)/i
        ];

        let vlcScore = 0;
        let spotifyScore = 0;

        // VLCパターンのチェック
        vlcPatterns.forEach((pattern, index) => {
            if (pattern.test(trackName) || pattern.test(artistName)) {
                vlcScore += 20;
                switch (index) {
                    case 0:
                        reasons.push("ファイル拡張子を検出");
                        break;
                    case 1:
                        reasons.push("ファイルパスを検出");
                        break;
                    case 2:
                        reasons.push("不明な楽曲情報");
                        break;
                    case 3:
                        reasons.push("数字のみの楽曲名");
                        break;
                    case 4:
                        reasons.push("日本語ファイル名");
                        break;
                }
            }
        });

        // Spotifyパターンのチェック（VLCパターンが検出されない場合のみ）
        if (vlcScore === 0) {
            // 正常な英数字の楽曲名・アーティスト名
            if (hasValidTrackName && hasValidArtistName) {
                spotifyScore += 30;
                reasons.push("正常な楽曲メタデータ");
            }

            // フィーチャリングやリミックス表記
            spotifyPatterns.slice(2).forEach((pattern, index) => {
                if (pattern.test(trackName)) {
                    spotifyScore += 10;
                    switch (index) {
                        case 0:
                            reasons.push("フィーチャリング表記");
                            break;
                        case 1:
                            reasons.push("リミックス・バージョン表記");
                            break;
                    }
                }
            });

            // 文字数による判定（Spotifyは一般的に整理されたメタデータ）
            if (trackName.length > 3 && trackName.length < 100 && 
                artistName.length > 2 && artistName.length < 50) {
                spotifyScore += 15;
                reasons.push("適切な文字数範囲");
            }
        }

        // 追加データがある場合の分析
        if (additionalData) {
            if (additionalData.source) {
                if (additionalData.source.includes("VLC")) {
                    vlcScore += 40;
                    reasons.push("VLCソース情報");
                } else if (additionalData.source.includes("Spotify")) {
                    spotifyScore += 40;
                    reasons.push("Spotifyソース情報");
                }
            }

            // 再生時間情報
            if (additionalData.duration) {
                if (additionalData.duration > 0) {
                    spotifyScore += 5;
                    reasons.push("正確な再生時間情報");
                }
            }

            // アルバム情報
            if (additionalData.albumName && additionalData.albumName !== "Unknown Album") {
                spotifyScore += 10;
                reasons.push("正確なアルバム情報");
            }
        }

        // 最終判定
        if (vlcScore > spotifyScore) {
            detectedSource = "VLC";
            confidence = Math.min(95, 50 + vlcScore);
        } else if (spotifyScore > vlcScore) {
            detectedSource = "Spotify";
            confidence = Math.min(95, 50 + spotifyScore);
        } else {
            detectedSource = "Unknown";
            confidence = 30;
            reasons.push("判定困難");
        }

        // 信頼度の調整
        if (metadataQuality === "Poor") {
            confidence = Math.max(30, confidence - 20);
        } else if (metadataQuality === "Fair") {
            confidence = Math.max(40, confidence - 10);
        }

        return {
            detectedSource,
            confidence: Math.round(confidence),
            reasons,
            metadataQuality,
            rawData: {
                vlcScore,
                spotifyScore,
                trackName,
                artistName,
                hasValidTrackName,
                hasValidArtistName
            }
        };
    }

    /**
     * 複数の分析結果を比較・統合
     */
    static compareAnalysisResults(results: SourceAnalysisResult[]): SourceAnalysisResult {
        if (results.length === 0) {
            return {
                detectedSource: "Unknown",
                confidence: 0,
                reasons: ["分析データなし"],
                metadataQuality: "Poor"
            };
        }

        if (results.length === 1) {
            return results[0];
        }

        // 最も信頼度の高い結果を選択
        const bestResult = results.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );

        // 他の結果との一致度をチェック
        const sameSourceResults = results.filter(r => r.detectedSource === bestResult.detectedSource);
        const consensusBonus = sameSourceResults.length > 1 ? 10 : 0;

        return {
            ...bestResult,
            confidence: Math.min(99, bestResult.confidence + consensusBonus),
            reasons: [
                ...bestResult.reasons,
                ...(consensusBonus > 0 ? [`複数分析で一致 (${sameSourceResults.length}/${results.length})`] : [])
            ]
        };
    }
}
