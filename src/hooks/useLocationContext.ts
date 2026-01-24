import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNotificationPreferences } from "./useNotificationPreferences";
import { useBudgets } from "./useBudgets";
import { toast } from "sonner";

interface PlaceInfo {
  name: string;
  address: string;
  types: string[];
  placeId: string;
}

interface LocationContextAlert {
  category: string;
  categoryId: string;
  placeName: string;
  budgetRemaining: number;
  budgetTotal: number;
  percentage: number;
}

// Map common place types to budget categories
const PLACE_TYPE_TO_CATEGORY: Record<string, string> = {
  restaurant: "Alimentação",
  cafe: "Alimentação",
  bakery: "Alimentação",
  food: "Alimentação",
  bar: "Alimentação",
  supermarket: "Mercado",
  grocery_or_supermarket: "Mercado",
  convenience_store: "Mercado",
  gas_station: "Transporte",
  pharmacy: "Saúde",
  hospital: "Saúde",
  doctor: "Saúde",
  dentist: "Saúde",
  gym: "Saúde",
  shopping_mall: "Compras",
  clothing_store: "Compras",
  shoe_store: "Compras",
  electronics_store: "Compras",
  home_goods_store: "Casa",
  furniture_store: "Casa",
  hardware_store: "Casa",
  beauty_salon: "Beleza",
  hair_care: "Beleza",
  spa: "Beleza",
  movie_theater: "Lazer",
  amusement_park: "Lazer",
  night_club: "Lazer",
  pet_store: "Pets",
  veterinary_care: "Pets",
};

// Using OpenStreetMap Nominatim (free, no API key needed)
async function reverseGeocode(lat: number, lng: number): Promise<PlaceInfo | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "pt-BR",
          "User-Agent": "OikFinance/1.0",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    
    // Map OSM categories to our types
    const osmCategory = data.type || data.category || "";
    const types = mapOsmToPlaceTypes(osmCategory, data.class);

    return {
      name: data.name || data.display_name?.split(",")[0] || "Local",
      address: data.display_name || "",
      types,
      placeId: data.osm_id?.toString() || "",
    };
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return null;
  }
}

function mapOsmToPlaceTypes(type: string, category: string): string[] {
  const types: string[] = [];
  const combined = `${category}_${type}`.toLowerCase();

  // Map OSM categories to our internal types
  if (["restaurant", "fast_food", "cafe", "bar", "pub", "food_court"].includes(type)) {
    types.push("restaurant", "food");
  }
  if (["supermarket", "grocery", "greengrocer", "marketplace"].includes(type)) {
    types.push("supermarket", "grocery_or_supermarket");
  }
  if (["pharmacy", "hospital", "clinic", "doctors", "dentist"].includes(type)) {
    types.push("pharmacy", "hospital", "doctor");
  }
  if (["fuel", "gas_station"].includes(type)) {
    types.push("gas_station");
  }
  if (["clothes", "shoes", "boutique", "department_store", "mall"].includes(type)) {
    types.push("clothing_store", "shopping_mall");
  }
  if (["hairdresser", "beauty", "spa"].includes(type)) {
    types.push("beauty_salon", "spa");
  }
  if (["cinema", "theatre", "nightclub", "amusement_arcade"].includes(type)) {
    types.push("movie_theater", "night_club");
  }
  if (["fitness_centre", "gym", "sports_centre"].includes(type)) {
    types.push("gym");
  }
  if (["veterinary", "pet"].includes(type)) {
    types.push("veterinary_care", "pet_store");
  }
  if (["furniture", "hardware", "doityourself"].includes(type)) {
    types.push("furniture_store", "hardware_store", "home_goods_store");
  }
  if (["electronics", "mobile_phone", "computer"].includes(type)) {
    types.push("electronics_store");
  }

  return types;
}

export function useLocationContext() {
  const [isWatching, setIsWatching] = useState(false);
  const [lastAlert, setLastAlert] = useState<{
    placeId: string;
    timestamp: number;
  } | null>(null);
  const [currentAlert, setCurrentAlert] = useState<LocationContextAlert | null>(null);

  const { data: preferences } = useNotificationPreferences();
  const budgetsQuery = useBudgets();
  const budgets = budgetsQuery.data;

  const isEnabled = preferences?.push_location_context ?? false;

  const checkLocation = useCallback(async () => {
    if (!isEnabled || !budgets) return;

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        }
      );

      const { latitude, longitude } = position.coords;
      const placeInfo = await reverseGeocode(latitude, longitude);

      if (!placeInfo) return;

      // Check anti-spam: don't alert for same place within 6 hours
      if (
        lastAlert &&
        lastAlert.placeId === placeInfo.placeId &&
        Date.now() - lastAlert.timestamp < 6 * 60 * 60 * 1000
      ) {
        return;
      }

      // Find matching category from place types
      let matchedCategory: string | null = null;
      for (const type of placeInfo.types) {
        if (PLACE_TYPE_TO_CATEGORY[type]) {
          matchedCategory = PLACE_TYPE_TO_CATEGORY[type];
          break;
        }
      }

      if (!matchedCategory) return;

      // Find budget for this category
      const matchedBudget = budgets.find((b) => {
        // This assumes budgets have category name in metadata or we need to look it up
        // For now, we'll match by a simple category mapping
        return b.category_id && matchedCategory;
      });

      if (!matchedBudget) return;

      const remaining = matchedBudget.monthly_limit - (matchedBudget.projected_amount || 0);
      const percentage = ((matchedBudget.projected_amount || 0) / matchedBudget.monthly_limit) * 100;

      setCurrentAlert({
        category: matchedCategory,
        categoryId: matchedBudget.category_id,
        placeName: placeInfo.name,
        budgetRemaining: remaining,
        budgetTotal: matchedBudget.monthly_limit,
        percentage,
      });

      setLastAlert({
        placeId: placeInfo.placeId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Location check error:", error);
    }
  }, [isEnabled, budgets, lastAlert]);

  const dismissAlert = useCallback(() => {
    setCurrentAlert(null);
  }, []);

  const startWatching = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalização não suportada");
      return;
    }

    setIsWatching(true);
    // Initial check
    checkLocation();

    // Check every 5 minutes while watching
    const interval = setInterval(checkLocation, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      setIsWatching(false);
    };
  }, [checkLocation]);

  const stopWatching = useCallback(() => {
    setIsWatching(false);
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (isEnabled && !isWatching) {
      const cleanup = startWatching();
      return cleanup;
    }
  }, [isEnabled, isWatching, startWatching]);

  return {
    isEnabled,
    isWatching,
    currentAlert,
    dismissAlert,
    startWatching,
    stopWatching,
    checkLocation,
  };
}
