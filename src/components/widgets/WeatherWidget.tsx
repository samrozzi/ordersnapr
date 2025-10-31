import { useEffect, useState } from "react";
import { Cloud, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeatherData {
  temp: number;
  condition: string;
  high: number;
  low: number;
  location: string;
}

export const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Simulate weather data - replace with actual API call
            setWeather({
              temp: 72,
              condition: "Partly Cloudy",
              high: 78,
              low: 65,
              location: "Current Location",
            });
            setLoading(false);
          },
          (error) => {
            setError("Location access denied");
            setLoading(false);
          }
        );
      } else {
        setError("Geolocation not supported");
        setLoading(false);
      }
    };

    getLocation();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading weather...</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
        <Cloud className="h-12 w-12 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">{error || "Unable to load weather"}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Allow Location
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Location */}
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{weather.location}</span>
      </div>

      {/* Main temp */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-bold">{weather.temp}°</div>
          <div className="text-lg text-muted-foreground mt-2">{weather.condition}</div>
        </div>
      </div>

      {/* High/Low */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="text-center">
          <div className="text-muted-foreground">High</div>
          <div className="font-semibold">{weather.high}°</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Low</div>
          <div className="font-semibold">{weather.low}°</div>
        </div>
      </div>
    </div>
  );
};
