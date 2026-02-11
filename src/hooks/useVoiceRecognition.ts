import { useState, useEffect, useCallback, useRef } from 'react';

// Add type definitions for Web Speech API
interface IWindow extends Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
}

interface UseVoiceRecognitionProps {
    onResult: (transcript: string) => void;
    onError?: (error: string) => void;
    language?: 'en' | 'fr' | 'ar';
}

export const useVoiceRecognition = ({ onResult, onError, language = 'en' }: UseVoiceRecognitionProps) => {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
    const isListeningRef = useRef(false);
    const onResultRef = useRef(onResult);
    const onErrorRef = useRef(onError);

    // Update refs
    useEffect(() => {
        onResultRef.current = onResult;
        onErrorRef.current = onError;
    }, [onResult, onError]);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    // Get available audio input devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Check if mediaDevices is supported
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.warn("Media devices not supported (insecure context?)");
                    return;
                }

                // Request permission first to ensure we can list labels
                await navigator.mediaDevices.getUserMedia({ audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(device => device.kind === 'audioinput');
                setAvailableDevices(audioInputs);
            } catch (error) {
                console.error("Error getting audio devices:", error);
                if (onErrorRef.current) {
                    onErrorRef.current("Microphone permission denied or no device found.");
                }
            }
        };
        getDevices();
    }, []);

    useEffect(() => {
        const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
        if (webkitSpeechRecognition || SpeechRecognition) {
            const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognitionConstructor();

            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = false;

            // Set language based on parameter
            const langCode = language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-SA' : 'en-US';
            recognitionInstance.lang = langCode;

            // Add Grammar List (if supported)
            const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
            if (SpeechGrammarList) {
                const speechRecognitionList = new SpeechGrammarList();

                let grammarString = '';
                if (language === 'fr') {
                    grammarString = '#JSGF V1.0; grammar commands; public <command> = passe | tir | but | faute | un | deux | trois | quatre | cinq | six | sept | huit | neuf | dix;';
                } else if (language === 'ar') {
                    // Arabic grammar might be tricky with encoding, but let's try standard transliteration or Arabic script if supported. 
                    // Browsers often handle UTF-8. Let's use both for safety.
                    grammarString = '#JSGF V1.0; grammar commands; public <command> = tamrir | tasdid | hadaf | khata | wahid | ithnan | thalatha | arbaa | khamsa | sitta | sabaa | thamaniya | tisaa | ashara;';
                } else {
                    grammarString = '#JSGF V1.0; grammar commands; public <command> = pass | shoot | goal | foul | one | two | three | four | five | six | seven | eight | nine | ten;';
                }

                speechRecognitionList.addFromString(grammarString, 1);
                recognitionInstance.grammars = speechRecognitionList;
            }

            recognitionInstance.onresult = (event: any) => {
                const lastResultIndex = event.results.length - 1;
                const transcript = event.results[lastResultIndex][0].transcript;
                // Use ref to call the latest callback
                if (onResultRef.current) {
                    onResultRef.current(transcript);
                }
            };

            recognitionInstance.onend = () => {
                // Only turn off listening if we aren't supposed to be listening anymore
                if (!isListeningRef.current) {
                    setIsListening(false);
                } else {
                    // Auto-restart if we were supposed to be listening
                    // Add a small delay to prevent rapid-fire restarts
                    setTimeout(() => {
                        if (isListeningRef.current) {
                            try {
                                recognitionInstance.start();
                                console.log("Voice recognition auto-restarted");
                            } catch (e) {
                                console.log("Voice recognition restart failed (already started?)", e);
                            }
                        }
                    }, 100);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                // Ignore "no-speech" errors as they're expected when user isn't speaking
                if (event.error === 'no-speech') {
                    return;
                }

                // Suppress network errors and auto-retry (common with Web Speech API)
                if (event.error === 'network') {
                    if (onErrorRef.current) onErrorRef.current("Network error: Check connection.");
                    return;
                }

                // Suppress "aborted" errors (happens when user stops listening)
                if (event.error === 'aborted') {
                    return;
                }

                // For other errors, log and stop
                console.error('Speech recognition error:', event.error);
                if (onErrorRef.current) {
                    onErrorRef.current(`Speech Error: ${event.error}`);
                }
                setIsListening(false);
            };

            setRecognition(recognitionInstance);

            // If we were already listening, restart with new language
            if (isListeningRef.current) {
                recognitionInstance.start();
            }

            return () => {
                recognitionInstance.abort();
                setRecognition(null);
            };
        }
    }, [language]);

    const startListening = useCallback(() => {
        if (recognition && !isListening) {
            try {
                recognition.start();
                setIsListening(true);
            } catch (error) {
                console.error("Failed to start recognition:", error);
            }
        }
    }, [recognition, isListening]);

    const stopListening = useCallback(() => {
        if (recognition && isListening) {
            recognition.stop();
            setIsListening(false);
        }
    }, [recognition, isListening]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        startListening,
        stopListening,
        toggleListening,
        isSupported: !!recognition,
        availableDevices
    };
};
