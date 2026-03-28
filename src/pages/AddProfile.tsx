import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Search, Link as LinkIcon, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  name: string;
  headline?: string;
  avatar_url?: string;
  linkedin_url: string;
}

const AddProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Manual add state
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [profileName, setProfileName] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const addMutation = useMutation({
    mutationFn: async (profile: { linkedin_url: string; name: string; avatar_url?: string; headline?: string }) => {
      const { error } = await supabase.from("tracked_profiles").insert({ ...profile, user_id: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked_profiles"] });
      toast.success("Profil ajouté avec succès !");
      navigate("/");
    },
    onError: () => toast.error("Erreur lors de l'ajout du profil"),
  });

  const handleManualAdd = () => {
    if (!linkedinUrl || !profileName) {
      toast.error("Veuillez remplir l'URL et le nom");
      return;
    }
    addMutation.mutate({ linkedin_url: linkedinUrl, name: profileName });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-profiles", {
        body: { query: searchQuery },
      });
      if (error) throw error;
      setSearchResults(data?.results ?? []);
      if (data?.results?.length === 0) {
        toast.info("Aucun résultat trouvé");
      }
    } catch {
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  };

  const handleAddFromSearch = (result: SearchResult) => {
    addMutation.mutate({
      linkedin_url: result.linkedin_url,
      name: result.name,
      avatar_url: result.avatar_url,
      headline: result.headline,
    });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajouter un profil</h1>
          <p className="text-muted-foreground">
            Ajoutez un profil LinkedIn à surveiller par URL ou recherche
          </p>
        </div>

        {/* Manual add */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LinkIcon className="h-5 w-5" />
              Ajouter par URL
            </CardTitle>
            <CardDescription>Collez l'URL du profil LinkedIn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL LinkedIn</Label>
              <Input
                id="url"
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom du profil</Label>
              <Input
                id="name"
                placeholder="Jean Dupont"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <Button onClick={handleManualAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter le profil
            </Button>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              Rechercher un profil
            </CardTitle>
            <CardDescription>Recherchez via l'API Unipile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nom, entreprise, poste..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={result.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {result.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.name}</p>
                      {result.headline && (
                        <p className="text-xs text-muted-foreground truncate">{result.headline}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddFromSearch(result)}
                      disabled={addMutation.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AddProfile;
