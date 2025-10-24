import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface Property {
  id: string;
  property_name: string;
  address: string | null;
  contact: string | null;
  access_information: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface PropertyMapProps {
  properties: Property[];
  userLocation?: { lat: number; lng: number } | null;
}

export function PropertyMap({ properties, userLocation }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [isTokenSet, setIsTokenSet] = useState(false);

  useEffect(() => {
    // Check if token is already in localStorage
    const savedToken = localStorage.getItem("mapbox_token");
    if (savedToken) {
      setMapboxToken(savedToken);
      setIsTokenSet(true);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !isTokenSet || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;

    // Calculate center based on properties with coordinates
    const propertiesWithCoords = properties.filter(
      (p) => p.latitude !== null && p.longitude !== null
    );

    let center: [number, number] = [-98.5795, 39.8283]; // Default to center of US
    let zoom = 4;

    if (propertiesWithCoords.length > 0) {
      // Calculate average position
      const avgLat =
        propertiesWithCoords.reduce((sum, p) => sum + (p.latitude || 0), 0) /
        propertiesWithCoords.length;
      const avgLng =
        propertiesWithCoords.reduce((sum, p) => sum + (p.longitude || 0), 0) /
        propertiesWithCoords.length;
      center = [avgLng, avgLat];
      zoom = 10;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: center,
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add markers for each property
    propertiesWithCoords.forEach((property) => {
      if (property.latitude && property.longitude) {
        // Create custom marker element
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.width = "30px";
        el.style.height = "30px";
        el.style.cursor = "pointer";
        
        // Create icon
        const icon = document.createElement("div");
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
        el.appendChild(icon);

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${property.property_name}</h3>
            ${property.address ? `<p style="margin-bottom: 4px;">${property.address}</p>` : ""}
            ${property.contact ? `<p style="margin-bottom: 4px;">Contact: ${property.contact}</p>` : ""}
          </div>
        `);

        // Add marker to map
        new mapboxgl.Marker(el)
          .setLngLat([property.longitude, property.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });

    // Add user location marker if available
    if (userLocation) {
      const el = document.createElement("div");
      el.className = "user-location-marker";
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#3b82f6";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 0 10px rgba(59, 130, 246, 0.5)";

      const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
        <div style="padding: 8px;">
          <p style="font-weight: bold;">Your Location</p>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(popup)
        .addTo(map.current!);
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [properties, userLocation, isTokenSet, mapboxToken]);

  const handleSetToken = () => {
    if (mapboxToken) {
      localStorage.setItem("mapbox_token", mapboxToken);
      setIsTokenSet(true);
    }
  };

  if (!isTokenSet) {
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Property Map</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mapbox-token">Mapbox Access Token</Label>
          <p className="text-sm text-muted-foreground">
            To display the map, please enter your Mapbox public access token.{" "}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Get your token here
            </a>
          </p>
          <Input
            id="mapbox-token"
            type="text"
            placeholder="pk.eyJ1..."
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
          />
          <Button onClick={handleSetToken} disabled={!mapboxToken}>
            Set Token
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ height: "500px" }}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
