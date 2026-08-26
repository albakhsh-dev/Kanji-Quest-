import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { validKanjiData, Kanji } from '../data/kanji';
import { Button } from '../components/ui/Button';

export default function Flashcards() {
  const { level } = useParams<{ level: string }>();
  const [isFlipped, setIsFlipped] = useState(false);
  
  // SRS-lite State
  const [deck, setDeck] = useState<Kanji[]>([]);
  const [history, setHistory] = useState<Kanji[]>([]);
  const [currentCard, setCurrentCard] = useState<Kanji | null>(null);

  // Initialize deck
  useEffect(() => {
    let filtered = validKanjiData;
    if (level) {
      filtered = filtered.filter(k => k.level === level);
    }
    
    // Shuffle
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    setDeck(shuffled);
    if (shuffled.length > 0) {
      setCurrentCard(shuffled[0]);
    }
  }, [level]);

  if (!currentCard) return <div className="text-center pt-12">No cards to review for {level || 'this level'}.</div>;

  const handleNext = (knewIt: boolean) => {
    setIsFlipped(false);
    
    setTimeout(() => {
      // Save current to history
      setHistory(prev => [...prev, currentCard]);
      
      // Update deck
      let newDeck = [...deck];
      if (knewIt) {
        // Remove from deck if they know it
        newDeck = newDeck.filter(k => k.kanji !== currentCard.kanji);
      } else {
        // Move to the end of the deck or reshuffle slightly if they need practice
        newDeck = newDeck.filter(k => k.kanji !== currentCard.kanji);
        newDeck.push(currentCard); // Put it at the back
      }
      
      setDeck(newDeck);
      
      // Pick next
      if (newDeck.length > 0) {
        // Randomly pick from top 5 to keep it fresh but structured
        const pickIndex = Math.min(Math.floor(Math.random() * 5), newDeck.length - 1);
        setCurrentCard(newDeck[pickIndex]);
      } else {
        setCurrentCard(null); // Finished deck
      }
    }, 150);
  };

  const handlePrevious = () => {
    if (history.length === 0) return;
    
    setIsFlipped(false);
    setTimeout(() => {
      const previousCard = history[history.length - 1];
      
      // Pop from history
      setHistory(prev => prev.slice(0, -1));
      
      // Put previous card back into play and set as current
      setCurrentCard(previousCard);
      
      // We don't strictly re-add it to deck here because it becomes the current card.
      // If they answer it again, it'll follow the handleNext logic.
      if (!deck.find(k => k.kanji === previousCard.kanji)) {
        setDeck(prev => [previousCard, ...prev]);
      }
    }, 150);
  };

  return (
    <div className="space-y-8 max-w-xl mx-auto pt-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-theme-text mb-2">Smart Review</h1>
        <p className="text-theme-muted">Practice your weak Kanji. {deck.length} remaining.</p>
      </header>

      <div className="relative h-96 w-full perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentCard.kanji + (isFlipped ? '-back' : '-front')}
            initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 w-full h-full bg-theme-panel rounded-3xl shadow-lg border border-theme-border flex flex-col items-center justify-center p-8 backface-hidden"
          >
            {!isFlipped ? (
              // Front
              <span className="text-9xl font-japanese font-bold text-theme-text">
                {currentCard.kanji}
              </span>
            ) : (
              // Back
              <div className="text-center w-full">
                <div className="text-3xl font-bold mb-4 text-theme-text">{currentCard.meanings.join(', ')}</div>
                <div className="text-xl text-theme-muted mb-2">{currentCard.onyomi.join(', ')}</div>
                <div className="text-xl text-theme-muted mb-8">{currentCard.kunyomi.join(', ')}</div>
                
                {/* Prominent Play Audio Button */}
                <button 
                  className="mb-8 flex items-center justify-center gap-2 mx-auto w-48 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/50 dark:hover:bg-blue-800/80 dark:text-blue-100 rounded-xl font-bold transition-colors shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Play vocabulary if exists, else play kunyomi or onyomi
                    const textToSpeak = (currentCard.vocabulary && currentCard.vocabulary[0]) 
                      ? currentCard.vocabulary[0].word 
                      : (currentCard.kunyomi[0] || currentCard.onyomi[0] || currentCard.kanji);
                    const utterance = new SpeechSynthesisUtterance(textToSpeak);
                    utterance.lang = 'ja-JP';
                    window.speechSynthesis.speak(utterance);
                  }}
                  title="Play Pronunciation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                  Listen
                </button>
                
                {currentCard.vocabulary && currentCard.vocabulary[0] && (
                  <div className="bg-gray-50/50 dark:bg-gray-800/50 border border-theme-border p-4 rounded-xl text-left">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-2xl font-bold text-theme-text">{currentCard.vocabulary[0].word}</span>
                      <span className="text-theme-muted">{currentCard.vocabulary[0].reading}</span>
                    </div>
                    <div className="text-theme-text opacity-80">{currentCard.vocabulary[0].meaning}</div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-4 opacity-100 transition-opacity">
        <Button variant="secondary" className="px-6" disabled={history.length === 0} onClick={(e) => { e.stopPropagation(); handlePrevious(); }}>
          Previous
        </Button>
        <Button variant="danger" className="flex-1" onClick={(e) => { e.stopPropagation(); handleNext(false); }}>
          Need Practice
        </Button>
        <Button variant="primary" className="flex-1 bg-green-500 hover:bg-green-600" onClick={(e) => { e.stopPropagation(); handleNext(true); }}>
          Know It
        </Button>
      </div>
    </div>
  );
}
