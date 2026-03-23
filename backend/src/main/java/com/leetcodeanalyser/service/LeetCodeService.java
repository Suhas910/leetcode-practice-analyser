package com.leetcodeanalyser.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leetcodeanalyser.model.SolvedProblem;
import com.leetcodeanalyser.model.UserStats;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.List;
import java.util.Map;

@Service
public class LeetCodeService {

    private static final String LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

    // ──── 1. USER STATS (unchanged) ────

    public UserStats getUserStats(String username) {

        String query = """
                query getUserProfile($username: String!) {
                  matchedUser(username: $username) {
                    submitStats {
                      acSubmissionNum {
                        difficulty
                        count
                      }
                    }
                  }
                }
                """;

        Map<String, Object> variables = new HashMap<>();
        variables.put("username", username);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("query", query);
        requestBody.put("variables", variables);

        RestTemplate restTemplate = new RestTemplate();
        ObjectMapper objectMapper = new ObjectMapper();

        try {
            String response = restTemplate.postForObject(
                    LEETCODE_GRAPHQL_URL,
                    requestBody,
                    String.class);

            JsonNode rootNode = objectMapper.readTree(response);
            JsonNode statsArray = rootNode
                    .path("data")
                    .path("matchedUser")
                    .path("submitStats")
                    .path("acSubmissionNum");

            int total = 0;
            int easy = 0;
            int medium = 0;
            int hard = 0;

            for (JsonNode node : statsArray) {
                String difficulty = node.get("difficulty").asText();
                int count = node.get("count").asInt();

                switch (difficulty) {
                    case "All" -> total = count;
                    case "Easy" -> easy = count;
                    case "Medium" -> medium = count;
                    case "Hard" -> hard = count;
                }
            }

            return new UserStats(total, easy, medium, hard);

        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch or parse LeetCode stats", e);
        }
    }

    // ──── 2. PROBLEM TAGS (unchanged) ────

    public String getProblemTags(String titleSlug) {

        String query = """
                query getProblemTags($slug: String!) {
                  question(titleSlug: $slug) {
                    title
                    topicTags {
                      name
                    }
                  }
                }
                """;

        Map<String, Object> variables = new HashMap<>();
        variables.put("slug", titleSlug);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("query", query);
        requestBody.put("variables", variables);

        RestTemplate restTemplate = new RestTemplate();

        return restTemplate.postForObject(
                LEETCODE_GRAPHQL_URL,
                requestBody,
                String.class);
    }

    // ──── 3. PATTERN COUNTS (from username, unchanged) ────

    public AnalyticsResponse getPatternCounts(String username) {
        String query = """
                query userSkillStats($username: String!) {
                  matchedUser(username: $username) {
                    tagProblemCounts {
                      advanced { tagName problemsSolved }
                      intermediate { tagName problemsSolved }
                      fundamental { tagName problemsSolved }
                    }
                  }
                }
                """;

        Map<String, Object> variables = Map.of("username", username);
        Map<String, Object> requestBody = Map.of("query", query, "variables", variables);

        try {
            RestTemplate restTemplate = new RestTemplate();
            String response = restTemplate.postForObject(LEETCODE_GRAPHQL_URL, requestBody, String.class);

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response);
            JsonNode tagGroups = root.path("data").path("matchedUser").path("tagProblemCounts");

            Map<String, Integer> rawData = new LinkedHashMap<>();
            String[] corePatterns = {
                    "Array / Hashing", "Two Pointers", "Sliding Window", "Binary Search",
                    "Stack / Queue", "Graphs", "Dynamic Programming", "Greedy", "Strings", "Math / Bit"
            };
            for (String p : corePatterns)
                rawData.put(p, 0);

            sumTiers(tagGroups.path("fundamental"), rawData);
            sumTiers(tagGroups.path("intermediate"), rawData);
            sumTiers(tagGroups.path("advanced"), rawData);

            Map<String, Integer> chartData = scaleForChart(rawData);

            return new AnalyticsResponse(rawData, chartData);

        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch Skill DNA: " + e.getMessage());
        }
    }

    // ──── 4. NEW: ANALYZE PUBLIC LIST ────

    /**
     * Fetches all problems from a LeetCode public list, categorizes them by
     * pattern,
     * and builds the full analysis response.
     */
    public ListAnalysisResponse analyzeList(String listSlug) {
        List<SolvedProblem> allProblems = getProblemsFromList(listSlug);
        Map<String, List<SolvedProblem>> patternMap = buildPatternMap(allProblems);
        Map<String, Integer> rawData = buildRawCounts(patternMap);
        Map<String, Integer> chartData = scaleForChart(rawData);

        return new ListAnalysisResponse(allProblems, patternMap, rawData, chartData, allProblems.size());
    }

    /**
     * Fetches all problems from a public LeetCode list using pagination.
     * Uses the favoriteQuestionList GraphQL query (100 problems per page).
     */
    private List<SolvedProblem> getProblemsFromList(String listSlug) {
        String query = """
                query favoriteQuestionList($favoriteSlug: String!, $limit: Int, $skip: Int) {
                  favoriteQuestionList(
                    favoriteSlug: $favoriteSlug
                    limit: $limit
                    skip: $skip
                  ) {
                    questions {
                      title
                      titleSlug
                      difficulty
                      topicTags { name }
                    }
                    totalLength
                    hasMore
                  }
                }
                """;

        RestTemplate restTemplate = new RestTemplate();
        ObjectMapper mapper = new ObjectMapper();
        List<SolvedProblem> allProblems = new ArrayList<>();

        int skip = 0;
        int limit = 100;
        boolean hasMore = true;

        while (hasMore) {
            Map<String, Object> variables = new HashMap<>();
            variables.put("favoriteSlug", listSlug);
            variables.put("limit", limit);
            variables.put("skip", skip);

            Map<String, Object> requestBody = Map.of("query", query, "variables", variables);

            try {
                String response = restTemplate.postForObject(LEETCODE_GRAPHQL_URL, requestBody, String.class);
                JsonNode root = mapper.readTree(response);
                JsonNode listData = root.path("data").path("favoriteQuestionList");

                JsonNode questions = listData.path("questions");
                hasMore = listData.path("hasMore").asBoolean(false);

                if (questions.isArray()) {
                    for (JsonNode q : questions) {
                        String title = q.path("title").asText();
                        String titleSlug = q.path("titleSlug").asText();
                        String difficulty = q.path("difficulty").asText();

                        // Extract topic tags
                        List<String> tags = new ArrayList<>();
                        JsonNode tagsNode = q.path("topicTags");
                        if (tagsNode.isArray()) {
                            for (JsonNode tag : tagsNode) {
                                tags.add(tag.path("name").asText());
                            }
                        }

                        // Map to ALL matching core patterns (multi-tag)
                        Set<String> matchedPatterns = new LinkedHashSet<>();
                        for (String tag : tags) {
                            String mapped = mapTagToPattern(tag);
                            if (!mapped.equals("Others")) {
                                matchedPatterns.add(mapped);
                            }
                        }
                        if (matchedPatterns.isEmpty()) {
                            matchedPatterns.add("Others");
                        }
                        // Primary pattern = first match (for display)
                        String primaryPattern = matchedPatterns.iterator().next();

                        allProblems.add(
                                new SolvedProblem(title, titleSlug, normalizeDifficulty(difficulty),
                                        tags, primaryPattern, new ArrayList<>(matchedPatterns)));
                    }
                }

                skip += limit;

            } catch (Exception e) {
                throw new RuntimeException(
                        "Failed to fetch public list (page " + (skip / limit) + "): " + e.getMessage());
            }
        }

        return allProblems;
    }

    /**
     * Groups solved problems by ALL their matched patterns (multi-tag).
     * A single problem can appear under multiple pattern buckets.
     */
    private Map<String, List<SolvedProblem>> buildPatternMap(List<SolvedProblem> problems) {
        Map<String, List<SolvedProblem>> patternMap = new LinkedHashMap<>();
        String[] corePatterns = {
                "Array / Hashing", "Two Pointers", "Sliding Window", "Binary Search",
                "Stack / Queue", "Graphs", "Dynamic Programming", "Greedy",
                "Strings", "Math / Bit", "Backtracking", "Sorting", "Others"
        };
        for (String p : corePatterns) {
            patternMap.put(p, new ArrayList<>());
        }

        for (SolvedProblem problem : problems) {
            // Add to EVERY matching pattern bucket
            for (String pattern : problem.getPatterns()) {
                patternMap.computeIfAbsent(pattern, k -> new ArrayList<>()).add(problem);
            }
        }

        return patternMap;
    }

    /**
     * Builds raw problem counts from the pattern map.
     */
    private Map<String, Integer> buildRawCounts(Map<String, List<SolvedProblem>> patternMap) {
        Map<String, Integer> rawData = new LinkedHashMap<>();
        patternMap.forEach((pattern, problems) -> rawData.put(pattern, problems.size()));
        return rawData;
    }

    /**
     * Scales raw counts logarithmically for balanced radar chart display.
     */
    private Map<String, Integer> scaleForChart(Map<String, Integer> rawData) {
        Map<String, Integer> chartData = new LinkedHashMap<>();
        rawData.forEach((pattern, count) -> {
            if (count <= 0) {
                chartData.put(pattern, 0);
            } else {
                int scaledValue = (int) Math.round(10 * Math.log10(count + 1));
                chartData.put(pattern, scaledValue);
            }
        });
        return chartData;
    }

    /**
     * Normalizes difficulty strings (LeetCode API may return "EASY", "Easy", etc.)
     */
    private String normalizeDifficulty(String difficulty) {
        if (difficulty == null)
            return "Unknown";
        return switch (difficulty.toUpperCase()) {
            case "EASY" -> "Easy";
            case "MEDIUM" -> "Medium";
            case "HARD" -> "Hard";
            default -> difficulty;
        };
    }

    // ──── 5. RECOMMENDATION (now uses list data + AI) ────

    public Map<String, Object> getRecommendation(String username) {
        // Still uses the old pattern-count approach for username-only flow
        Map<String, Integer> patternCounts = getPatternCounts(username).getRawData();
        patternCounts.remove("Others");

        String weakestPattern = null;
        int minCount = Integer.MAX_VALUE;

        for (Map.Entry<String, Integer> entry : patternCounts.entrySet()) {
            if (entry.getValue() < minCount) {
                minCount = entry.getValue();
                weakestPattern = entry.getKey();
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("weakestPattern", weakestPattern != null ? weakestPattern : "No Pattern Found");
        response.put("reason", "Lowest recent exposure among core patterns");

        // Generic fallback — the list-based flow uses AI for recommendations
        response.put("recommendedProblem", Map.of(
                "title", "Keep practicing!",
                "link", "https://leetcode.com/problemset/all/"));

        return response;
    }

    /**
     * Builds a formatted string of all categorized problems for the AI prompt.
     */
    public String buildCategorizedSummary(Map<String, List<SolvedProblem>> patternMap) {
        StringBuilder sb = new StringBuilder();

        for (Map.Entry<String, List<SolvedProblem>> entry : patternMap.entrySet()) {
            String pattern = entry.getKey();
            List<SolvedProblem> problems = entry.getValue();

            sb.append("**").append(pattern).append(" (").append(problems.size()).append(" solved):** ");

            if (problems.isEmpty()) {
                sb.append("(none)");
            } else {
                List<String> titles = new ArrayList<>();
                for (SolvedProblem p : problems) {
                    titles.add(p.getTitle() + " (" + p.getDifficulty() + ")");
                }
                sb.append(String.join(", ", titles));
            }

            sb.append("\n");
        }

        return sb.toString();
    }

    // ──── HELPERS ────

    private void sumTiers(JsonNode tierNode, Map<String, Integer> patternCount) {
        if (tierNode.isArray()) {
            for (JsonNode tag : tierNode) {
                String name = tag.get("tagName").asText();
                int solved = tag.get("problemsSolved").asInt();
                String category = mapTagToPattern(name);

                if (patternCount.containsKey(category)) {
                    patternCount.put(category, patternCount.get(category) + solved);
                } else {
                    patternCount.put("Others", patternCount.getOrDefault("Others", 0) + solved);
                }
            }
        }
    }

    private String mapTagToPattern(String tag) {
        return switch (tag) {
            // Sliding window family
            case "Sliding Window", "Prefix Sum" -> "Sliding Window";

            // Pointer-based
            case "Two Pointers" -> "Two Pointers";

            // Searching
            case "Binary Search" -> "Binary Search";

            // Heap
            case "Heap", "Priority Queue" -> "Heap / Priority Queue";

            // Hashing / arrays
            case "Array", "Hash Table", "Counting", "Matrix", "Simulation" -> "Array / Hashing";

            // DP
            case "Dynamic Programming" -> "Dynamic Programming";

            // Graphs
            case "Graph", "Breadth-First Search", "Depth-First Search",
                    "Union Find", "Tree", "Binary Tree", "Binary Search Tree" ->
                "Graphs";

            // Backtracking
            case "Backtracking", "Recursion" -> "Backtracking";

            // Greedy
            case "Greedy" -> "Greedy";

            // Stack / Queue
            case "Stack", "Queue", "Monotonic Stack" -> "Stack / Queue";

            // Strings
            case "String" -> "Strings";

            // Math
            case "Math", "Bit Manipulation" -> "Math / Bit";

            // Sorting
            case "Sorting" -> "Sorting";

            // Linked List
            case "Linked List" -> "Linked List";

            default -> "Others";
        };
    }
}
