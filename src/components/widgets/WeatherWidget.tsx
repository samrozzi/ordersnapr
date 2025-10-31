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
    const fetchWeather = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
              // Use Open-Meteo API (free, no API key needed)
              const weatherResponse = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`
              );
              
              const weatherData = await weatherResponse.json();
              
              // Get location name from reverse geocoding
              const locationResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              const locationData = await locationResponse.json();
              
              // Map weather codes to conditions
              const weatherCode = weatherData.current.weather_code;
              const conditionMap: Record<number, string> = {
                0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
                45: "Foggy", 48: "Foggy", 51: "Light Drizzle", 53: "Drizzle",
                55: "Heavy Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
                71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 95: "Thunderstorm"
              };
              
              setWeather({
                temp: Math.round(weatherData.current.temperature_2m),
                condition: conditionMap[weatherCode] || "Unknown",
                high: Math.round(weatherData.daily.temperature_2m_max[0]),
                low: Math.round(weatherData.daily.temperature_2m_min[0]),
                location: locationData.address.city || locationData.address.town || "Current Location"
              });
              setLoading(false);
            } catch (error) {
              console.error("Error fetching weather:", error);
              setError("Unable to load weather");
              setLoading(false);
            }
          },
          (error) => {
            console.error("Error getting location:", error);
            setError("Location access denied");
            setLoading(false);
          }
        );
      } else {
        setError("Geolocation not supported");
        setLoading(false);
      }
    };

    fetchWeather();
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
    <div className="h-full flex flex-col pb-6">
      {/* Location */}
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{weather.location}</span>
      </div>

      {/* Main temp */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl sm:text-6xl font-bold">{weather.temp}°</div>
          <div className="text-base sm:text-lg text-muted-foreground mt-2">{weather.condition}</div>
        </div>
      </div>

      {/* High/Low */}
      <div className="flex justify-center gap-6 text-sm mt-6 pb-2">
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
