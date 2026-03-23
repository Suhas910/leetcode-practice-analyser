package com.leetcodeanalyser.service; // Use your actual package name here

import java.util.Map;

public class AnalyticsResponse {
    private Map<String, Integer> rawData;
    private Map<String, Integer> chartData;

    public AnalyticsResponse(Map<String, Integer> rawData, Map<String, Integer> chartData) {
        this.rawData = rawData;
        this.chartData = chartData;
    }

    public Map<String, Integer> getRawData() { return rawData; }
    public Map<String, Integer> getChartData() { return chartData; }
    
    public void setRawData(Map<String, Integer> rawData) { this.rawData = rawData; }
    public void setChartData(Map<String, Integer> chartData) { this.chartData = chartData; }
}
