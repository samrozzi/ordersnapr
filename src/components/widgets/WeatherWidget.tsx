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

  // Load cached weather on mount
  useEffect(() => {
    const cached = localStorage.getItem("weather-cache");
    const cacheTime = localStorage.getItem("weather-cache-time");
    
    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      // Use cache if less than 30 minutes old
      if (age < 30 * 60 * 1000) {
        setWeather(JSON.parse(cached));
        setLoading(false);
        return;
      }
    }
    
    // Fallback to fetching if no valid cache
    const savedZip = localStorage.getItem("weather-zip");
    if (savedZip) {
      setZipCode(savedZip);
      fetchWeatherByZip(savedZip);
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
            setError("Enable location access or enter ZIP");
            setLoading(false);
          }
        );
      } else {
        setError("Geolocation not supported");
        setLoading(false);
      }
    }
  }, []);

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
      
      const weatherObj = {
        temp: Math.round(weatherData.current.temperature_2m),
        condition: conditionMap[weatherCode] || "Unknown",
        high: Math.round(weatherData.daily.temperature_2m_max[0]),
        low: Math.round(weatherData.daily.temperature_2m_min[0]),
        location: locationData.address.city || locationData.address.town || "Current Location"
      };
      
      setWeather(weatherObj);
      
      // Cache weather data
      localStorage.setItem("weather-cache", JSON.stringify(weatherObj));
      localStorage.setItem("weather-cache-time", Date.now().toString());
      
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
      localStorage.setItem("weather-zip", zip);
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading weather...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-4">
        <Cloud className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">{error}</p>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Set Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Weather Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={manualZip}
                  onChange={(e) => setManualZip(e.target.value)}
                  placeholder="Enter ZIP code"
                />
              </div>
              <Button onClick={handleManualLocation} className="w-full">
                Update Location
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="h-full flex flex-col justify-between p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{weather.location}</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Weather Location</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={manualZip}
                    onChange={(e) => setManualZip(e.target.value)}
                    placeholder={zipCode || "Enter ZIP code"}
                  />
                </div>
                <Button onClick={handleManualLocation} className="w-full">
                  Update Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-center flex-1">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Cloud className="h-12 w-12 text-primary" />
            <span className="text-5xl font-bold">{weather.temp}°F</span>
          </div>
          <p className="text-lg text-muted-foreground">{weather.condition}</p>
        </div>
      </div>

      <div className="flex justify-around text-sm">
        <div className="text-center">
          <p className="text-muted-foreground">High</p>
          <p className="font-semibold">{weather.high}°</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Low</p>
          <p className="font-semibold">{weather.low}°</p>
        </div>
      </div>
    </div>
  );
};
