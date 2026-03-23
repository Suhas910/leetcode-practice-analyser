package com.leetcodeanalyser.service;

import com.leetcodeanalyser.model.SolvedProblem;
import java.util.List;
import java.util.Map;

public class ListAnalysisResponse {
    private List<SolvedProblem> problems;
    private Map<String, List<SolvedProblem>> patternMap;
    private Map<String, Integer> rawData;
    private Map<String, Integer> chartData;
    private int totalCount;

    public ListAnalysisResponse(
            List<SolvedProblem> problems,
            Map<String, List<SolvedProblem>> patternMap,
            Map<String, Integer> rawData,
            Map<String, Integer> chartData,
            int totalCount) {
        this.problems = problems;
        this.patternMap = patternMap;
        this.rawData = rawData;
        this.chartData = chartData;
        this.totalCount = totalCount;
    }

    public List<SolvedProblem> getProblems() {
        return problems;
    }

    public Map<String, List<SolvedProblem>> getPatternMap() {
        return patternMap;
    }

    public Map<String, Integer> getRawData() {
        return rawData;
    }

    public Map<String, Integer> getChartData() {
        return chartData;
    }

    public int getTotalCount() {
        return totalCount;
    }
}
