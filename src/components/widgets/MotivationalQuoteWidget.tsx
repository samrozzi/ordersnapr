import { useState, useEffect } from "react";
import { RefreshCw, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuoteData {
  text: string;
  author: string;
}

const FALLBACK_QUOTES: QuoteData[] = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Success is not how high you have climbed, but how you make a positive difference to the world.", author: "Roy T. Bennett" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
];

interface MotivationalQuoteWidgetProps {
  size: "S" | "M" | "L";
}

export const MotivationalQuoteWidget = ({ size }: MotivationalQuoteWidgetProps) => {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuote();
  }, []);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      // Check localStorage cache
      const cached = localStorage.getItem("daily-quote");
      const cacheDate = localStorage.getItem("daily-quote-date");
      const today = new Date().toISOString().split('T')[0];

      if (cached && cacheDate === today) {
        setQuote(JSON.parse(cached));
        setLoading(false);
        return;
      }

      // Fetch from API
      const response = await fetch("https://zenquotes.io/api/today");
      const data = await response.json();

      if (data && data[0]) {
        const quoteData: QuoteData = {
          text: data[0].q,
          author: data[0].a,
        };
        setQuote(quoteData);
        localStorage.setItem("daily-quote", JSON.stringify(quoteData));
        localStorage.setItem("daily-quote-date", today);
      } else {
        throw new Error("No quote data");
      }
    } catch (error) {
      console.error("Error fetching quote:", error);
      // Use random fallback
      const randomQuote = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      setQuote(randomQuote);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    const randomQuote = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    setQuote(randomQuote);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const maxLength = size === "S" ? 80 : size === "M" ? 150 : 999;
  const truncatedText = quote && quote.text.length > maxLength 
    ? quote.text.substring(0, maxLength) + "..." 
    : quote?.text || "";

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="absolute top-2 right-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {size === "L" && (
        <Quote className="h-12 w-12 text-primary/20 mb-4" />
      )}

      <blockquote className="text-center space-y-4">
        <p
          className={cn(
            "font-serif italic leading-relaxed",
            size === "S" ? "text-sm" : size === "M" ? "text-base" : "text-lg"
          )}
        >
          "{truncatedText}"
        </p>
        {size !== "S" && quote && (
          <footer className="text-sm text-muted-foreground font-medium">
            — {quote.author}
          </footer>
        )}
      </blockquote>

      {size === "L" && (
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <p className="text-xs text-muted-foreground">Quote of the Day</p>
        </div>
      )}
    </div>
  );
};
