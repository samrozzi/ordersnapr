import { useEffect, useState } from "react";
import { Cloud, MapPin, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [zipCode, setZipCode] = useState("");
  const [manualZip, setManualZip] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchWeatherByCoords = async (latitude: number, longitude: number) => {
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
  };

  const fetchWeatherByZip = async (zip: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use Nominatim to get coordinates from ZIP code
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`
      );
      const geoData = await geoResponse.json();
      
      if (geoData.length === 0) {
        setError("ZIP code not found");
        setLoading(false);
        return;
      }
      
      const latitude = parseFloat(geoData[0].lat);
      const longitude = parseFloat(geoData[0].lon);
      
      await fetchWeatherByCoords(latitude, longitude);
      setZipCode(zip);
    } catch (error) {
      console.error("Error fetching weather by ZIP:", error);
      setError("Unable to load weather");
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (zipCode) {
      fetchWeatherByZip(zipCode);
    } else {
      setLoading(true);
      setError(null);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await fetchWeatherByCoords(latitude, longitude);
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
    }
  };

  const handleManualLocation = () => {
    if (manualZip.trim()) {
      fetchWeatherByZip(manualZip);
      setSettingsOpen(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await fetchWeatherByCoords(latitude, longitude);
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
    <div className="h-full flex flex-col min-h-[160px]">
      {/* Header with location and controls */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground truncate">{weather.location}</span>
        </div>
        <div className="flex gap-1 ml-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Weather Location</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="zipcode">ZIP Code</Label>
                  <Input
                    id="zipcode"
                    placeholder="Enter ZIP code"
                    value={manualZip}
                    onChange={(e) => setManualZip(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualLocation()}
                  />
                </div>
                <Button onClick={handleManualLocation} className="w-full">
                  Set Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main temp - centered with flexible sizing */}
      <div className="flex-1 flex items-center justify-center py-2 min-h-0 overflow-hidden">
        <div className="text-center">
          <div className="text-4xl md:text-5xl font-bold leading-none">{weather.temp}°</div>
          <div className="text-sm md:text-base text-muted-foreground mt-1 line-clamp-1">{weather.condition}</div>
        </div>
      </div>

      {/* High/Low - wraps on small heights */}
      <div className="flex justify-center gap-4 text-sm shrink-0 flex-wrap">
        <div className="text-center">
          <div className="text-muted-foreground text-xs">High</div>
          <div className="font-semibold">{weather.high}°</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground text-xs">Low</div>
          <div className="font-semibold">{weather.low}°</div>
        </div>
      </div>
    </div>
  );
};
