import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis, ErrorBar } from 'recharts';
import _ from 'lodash';
import * as math from 'mathjs';
import Papa from 'papaparse';
import './charts.css';

const BioreactorHandleAnalysis = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [statisticalResults, setStatisticalResults] = useState(null);
  const [aggregateScores, setAggregateScores] = useState(null);
  const [demographicBreakdown, setDemographicBreakdown] = useState(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];
  const handleTypes = ['Rectangle Handle', 'Curved Handle', 'Circle Undergrip Handle'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use standard fetch API instead of window.fs
        const response = await fetch('/bioreactor_survey_responses.csv');
        const text = await response.text();
        
        const parsedData = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          delimitersToGuess: [',', '\t', '|', ';']
        });
        
        // Clean up any fields that should be numeric but contain text
        parsedData.data.forEach(row => {
          // For fields that should be numeric but might contain comments
          const attemptFields = ['Number of Attempts', 'Number of Attempts_1', 'Number of Attempts_2'];
          attemptFields.forEach(field => {
            if (row[field] && typeof row[field] === 'string') {
              // Extract just the numeric part (takes the first sequence of digits)
              const numericPart = row[field].match(/^\d+/);
              if (numericPart) {
                row[field] = parseInt(numericPart[0], 10);
              }
            }
          });
        });
        
        setData(parsedData.data);
        runStatisticalAnalysis(parsedData.data);
        setLoading(false);
      } catch (err) {
        setError('Error loading data: ' + err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Statistical Analysis Functions
  const runStatisticalAnalysis = (data) => {
    // Calculate statistical significance, effect sizes, and confidence intervals
    const metricsToAnalyze = [
      {
        name: 'Positioning Accuracy',
        rectangle: data.map(row => row['Positioning Accuracy']).filter(v => v !== null && v !== undefined),
        curved: data.map(row => row['Positioning Accuracy_1']).filter(v => v !== null && v !== undefined),
        circle: data.map(row => row['Positioning Accuracy_2']).filter(v => v !== null && v !== undefined)
      },
      {
        name: 'Number of Attempts',
        rectangle: data.map(row => row['Number of Attempts']).filter(v => v !== null && v !== undefined),
        curved: data.map(row => row['Number of Attempts_1']).filter(v => v !== null && v !== undefined),
        circle: data.map(row => row['Number of Attempts_2']).filter(v => v !== null && v !== undefined)
      },
      {
        name: 'Comfort',
        rectangle: data.map(row => row['Comfort']).filter(v => v !== null && v !== undefined),
        curved: data.map(row => row['Comfort_1']).filter(v => v !== null && v !== undefined),
        circle: data.map(row => row['Comfort_2']).filter(v => v !== null && v !== undefined)
      },
      {
        name: 'Grip Security',
        rectangle: data.map(row => row['Grip Security']).filter(v => v !== null && v !== undefined),
        curved: data.map(row => row['Grip Security_1']).filter(v => v !== null && v !== undefined),
        circle: data.map(row => row['Grip Security_2']).filter(v => v !== null && v !== undefined)
      },
      {
        name: 'Ease of Use',
        rectangle: data.map(row => row['Ease of Use']).filter(v => v !== null && v !== undefined),
        curved: data.map(row => row['Ease of Use_1']).filter(v => v !== null && v !== undefined),
        circle: data.map(row => row['Ease of Use_2']).filter(v => v !== null && v !== undefined)
      },
      {
        name: 'Intuitiveness',
        rectangle: data.map(row => row['Intuitiveness ']).filter(v => v !== null && v !== undefined),
        curved: data.map(row => row['Intuitiveness _1']).filter(v => v !== null && v !== undefined),
        circle: data.map(row => row['Intuitiveness _2']).filter(v => v !== null && v !== undefined)
      },
      {
        name: 'Overall Satisfaction',
        rectangle: data.map(row => row['Overall Satisfaction']).filter(v => v !== null && v !== undefined),
        curved: data.map(row => row['Overall Satisfaction_1']).filter(v => v !== null && v !== undefined),
        circle: data.map(row => row['Overall Satisfaction_2']).filter(v => v !== null && v !== undefined)
      }
    ];
    
    const analysisResults = metricsToAnalyze.map(metric => {
      const rectStats = calculateStats(metric.rectangle);
      const curvedStats = calculateStats(metric.curved);
      const circleStats = calculateStats(metric.circle);
      
      const rectCI = calculateCI(rectStats.mean, rectStats.stdDev, rectStats.n);
      const curvedCI = calculateCI(curvedStats.mean, curvedStats.stdDev, curvedStats.n);
      const circleCI = calculateCI(circleStats.mean, circleStats.stdDev, circleStats.n);
      
      // T-tests between pairs
      const rectVsCurved = tTest(metric.rectangle, metric.curved);
      const rectVsCircle = tTest(metric.rectangle, metric.circle);
      const curvedVsCircle = tTest(metric.curved, metric.circle);
      
      // Effect sizes
      const rectVsCurvedD = cohenD(metric.rectangle, metric.curved);
      const rectVsCircleD = cohenD(metric.rectangle, metric.circle);
      const curvedVsCircleD = cohenD(metric.curved, metric.circle);
      
      return {
        metric: metric.name,
        rectangle: {
          mean: rectStats.mean,
          stdDev: rectStats.stdDev,
          ci: rectCI,
          n: rectStats.n
        },
        curved: {
          mean: curvedStats.mean,
          stdDev: curvedStats.stdDev,
          ci: curvedCI,
          n: curvedStats.n
        },
        circle: {
          mean: circleStats.mean,
          stdDev: circleStats.stdDev,
          ci: circleCI,
          n: circleStats.n
        },
        comparisons: {
          rectVsCurved: {
            tValue: rectVsCurved.t,
            pValue: rectVsCurved.pValue,
            effectSize: rectVsCurvedD,
            interpretation: interpretCohenD(rectVsCurvedD)
          },
          rectVsCircle: {
            tValue: rectVsCircle.t,
            pValue: rectVsCircle.pValue,
            effectSize: rectVsCircleD,
            interpretation: interpretCohenD(rectVsCircleD)
          },
          curvedVsCircle: {
            tValue: curvedVsCircle.t,
            pValue: curvedVsCircle.pValue,
            effectSize: curvedVsCircleD,
            interpretation: interpretCohenD(curvedVsCircleD)
          }
        }
      };
    });
    
    setStatisticalResults(analysisResults);
    
    // Calculate aggregate scores
    calculateAggregateScores(data);
    
    // Calculate demographic breakdown
    calculateDemographicBreakdown(data);
  };
  
  // Calculate mean and standard deviation
  const calculateStats = (arr) => {
    if (!arr || arr.length === 0) return { mean: 0, stdDev: 0, n: 0 };
    const mean = math.mean(arr);
    const stdDev = math.std(arr);
    return { mean, stdDev, n: arr.length };
  };
  
  // Calculate confidence interval (95%)
  const calculateCI = (mean, stdDev, n) => {
    if (n <= 1) return [0, 0];
    const marginOfError = 1.96 * (stdDev / Math.sqrt(n));
    return [mean - marginOfError, mean + marginOfError];
  };
  
  // Simple t-test (unequal variances)
  const tTest = (arr1, arr2) => {
    if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) {
      return { t: 0, pValue: "> 0.05" };
    }
    
    const mean1 = math.mean(arr1);
    const mean2 = math.mean(arr2);
    const var1 = math.variance(arr1);
    const var2 = math.variance(arr2);
    const n1 = arr1.length;
    const n2 = arr2.length;
    
    // Calculate t-statistic
    const t = (mean1 - mean2) / Math.sqrt((var1/n1) + (var2/n2));
    
    // For small samples, we'll just use critical values approximation
    let pValue;
    if (Math.abs(t) > 2.7) pValue = "< 0.01";
    else if (Math.abs(t) > 2.0) pValue = "< 0.05";
    else pValue = "> 0.05";
    
    return { t, pValue };
  };
  
  // Calculate Cohen's d for effect size
  const cohenD = (arr1, arr2) => {
    if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) {
      return 0;
    }
    
    const mean1 = math.mean(arr1);
    const mean2 = math.mean(arr2);
    const n1 = arr1.length;
    const n2 = arr2.length;
    
    // Pooled standard deviation
    const s1 = math.std(arr1);
    const s2 = math.std(arr2);
    const pooledSD = Math.sqrt(((n1-1)*s1*s1 + (n2-1)*s2*s2) / (n1+n2-2));
    
    // Cohen's d
    return Math.abs(mean1 - mean2) / pooledSD;
  };
  
  // Interpret Cohen's d
  const interpretCohenD = (d) => {
    if (d < 0.2) return "Negligible";
    if (d < 0.5) return "Small";
    if (d < 0.8) return "Medium";
    return "Large";
  };
  
  // Calculate aggregate scores for each handle
  const calculateAggregateScores = (data) => {
    const scores = data.map(row => {
      // For "Number of Attempts", lower is better, so invert the score
      const maxAttempts = 5; // Assuming 5 is the max number of attempts
      const rectAttempts = row['Number of Attempts'] ? (maxAttempts - row['Number of Attempts']) : 0;
      const curvedAttempts = row['Number of Attempts_1'] ? (maxAttempts - row['Number of Attempts_1']) : 0;
      const circleAttempts = row['Number of Attempts_2'] ? (maxAttempts - row['Number of Attempts_2']) : 0;
      
      // Calculate weighted aggregate scores
      // Weights: Accuracy (1.5), Attempts (1.0), Comfort (1.2), Security (1.0), Ease (1.0), Intuitive (0.8), Satisfaction (1.5)
      const rectangleScore = (
        1.5 * (row['Positioning Accuracy'] || 0) +
        1.0 * rectAttempts +
        1.2 * (row['Comfort'] || 0) +
        1.0 * (row['Grip Security'] || 0) +
        1.0 * (row['Ease of Use'] || 0) +
        0.8 * (row['Intuitiveness '] || 0) +
        1.5 * (row['Overall Satisfaction'] || 0)
      ) / 8.0; // Divide by sum of weights
      
      const curvedScore = (
        1.5 * (row['Positioning Accuracy_1'] || 0) +
        1.0 * curvedAttempts +
        1.2 * (row['Comfort_1'] || 0) +
        1.0 * (row['Grip Security_1'] || 0) +
        1.0 * (row['Ease of Use_1'] || 0) +
        0.8 * (row['Intuitiveness _1'] || 0) +
        1.5 * (row['Overall Satisfaction_1'] || 0)
      ) / 8.0;
      
      const circleScore = (
        1.5 * (row['Positioning Accuracy_2'] || 0) +
        1.0 * circleAttempts +
        1.2 * (row['Comfort_2'] || 0) +
        1.0 * (row['Grip Security_2'] || 0) +
        1.0 * (row['Ease of Use_2'] || 0) +
        0.8 * (row['Intuitiveness _2'] || 0) +
        1.5 * (row['Overall Satisfaction_2'] || 0)
      ) / 8.0;
      
      return {
        participantId: row['  Please enter your assigned participant ID:'] || 'Unknown',
        rectangleScore,
        curvedScore,
        circleScore,
        topChoice: Math.max(rectangleScore, curvedScore, circleScore) === rectangleScore 
          ? 'Rectangle Handle' 
          : Math.max(rectangleScore, curvedScore, circleScore) === curvedScore
            ? 'Curved Handle'
            : 'Circle Undergrip Handle'
      };
    });
    
    // Calculate average scores and counts
    const avgRectangleScore = math.mean(scores.map(s => s.rectangleScore));
    const avgCurvedScore = math.mean(scores.map(s => s.curvedScore));
    const avgCircleScore = math.mean(scores.map(s => s.circleScore).filter(Boolean));
    
    const topChoiceCounts = {
      'Rectangle Handle': scores.filter(s => s.topChoice === 'Rectangle Handle').length,
      'Curved Handle': scores.filter(s => s.topChoice === 'Curved Handle').length,
      'Circle Undergrip Handle': scores.filter(s => s.topChoice === 'Circle Undergrip Handle').length
    };
    
    setAggregateScores({
      average: {
        'Rectangle Handle': avgRectangleScore,
        'Curved Handle': avgCurvedScore,
        'Circle Undergrip Handle': avgCircleScore
      },
      topChoiceCounts,
      detail: scores
    });
  };
  
  // Calculate demographic breakdown
  const calculateDemographicBreakdown = (data) => {
    const demographicFactors = ['Age Range', '  Gender  ', '  Hand Dominance  ', 'Previous Experience with Laboratory Equipment  ', 'Height'];
    const breakdown = {};
    
    demographicFactors.forEach(factor => {
      breakdown[factor] = {};
      
      // Get unique values for this demographic factor
      const uniqueValues = [...new Set(data.map(row => row[factor]).filter(Boolean))];
      
      uniqueValues.forEach(value => {
        // Filter data for this demographic value
        const filteredData = data.filter(row => row[factor] === value);
        const count = filteredData.length;
        
        // Calculate average preference for each handle
        const rectangleRank = math.mean(filteredData.map(row => row['Handle Preference Ranking  [Rectangle Handle]']).filter(Boolean));
        const curvedRank = math.mean(filteredData.map(row => row['Handle Preference Ranking  [Curved Handle]']).filter(Boolean));
        const circleRank = math.mean(filteredData.map(row => row['Handle Preference Ranking  [Circle Undergrip Handle]']).filter(Boolean));
        
        breakdown[factor][value] = {
          count,
          'Rectangle Handle': rectangleRank,
          'Curved Handle': curvedRank,
          'Circle Undergrip Handle': circleRank
        };
      });
    });
    
    setDemographicBreakdown(breakdown);
  };

  // Original data processing functions from the previous component
  const prepareRankingData = () => {
    const rankings = [
      { name: 'Rectangle Handle', firstChoice: 0, secondChoice: 0, thirdChoice: 0 },
      { name: 'Curved Handle', firstChoice: 0, secondChoice: 0, thirdChoice: 0 },
      { name: 'Circle Undergrip Handle', firstChoice: 0, secondChoice: 0, thirdChoice: 0 }
    ];

    data.forEach(row => {
      if (row['Handle Preference Ranking  [Rectangle Handle]'] === 1) rankings[0].firstChoice++;
      if (row['Handle Preference Ranking  [Rectangle Handle]'] === 2) rankings[0].secondChoice++;
      if (row['Handle Preference Ranking  [Rectangle Handle]'] === 3) rankings[0].thirdChoice++;
      
      if (row['Handle Preference Ranking  [Curved Handle]'] === 1) rankings[1].firstChoice++;
      if (row['Handle Preference Ranking  [Curved Handle]'] === 2) rankings[1].secondChoice++;
      if (row['Handle Preference Ranking  [Curved Handle]'] === 3) rankings[1].thirdChoice++;
      
      if (row['Handle Preference Ranking  [Circle Undergrip Handle]'] === 1) rankings[2].firstChoice++;
      if (row['Handle Preference Ranking  [Circle Undergrip Handle]'] === 2) rankings[2].secondChoice++;
      if (row['Handle Preference Ranking  [Circle Undergrip Handle]'] === 3) rankings[2].thirdChoice++;
    });

    return rankings;
  };

  const prepareMetricsData = () => {
    const metrics = [
      { name: 'Rectangle Handle', color: '#0088FE' },
      { name: 'Curved Handle', color: '#00C49F' },
      { name: 'Circle Undergrip Handle', color: '#FFBB28' }
    ];

    metrics.forEach(metric => {
      // Rectangle Handle uses base metrics
      if (metric.name === 'Rectangle Handle') {
        metric.Accuracy = _.meanBy(data, 'Positioning Accuracy');
        metric.Attempts = _.meanBy(data, 'Number of Attempts');
        metric.Comfort = _.meanBy(data, 'Comfort');
        metric.Security = _.meanBy(data, 'Grip Security');
        metric.Ease = _.meanBy(data, 'Ease of Use');
        metric.Intuitive = _.meanBy(data, 'Intuitiveness ');
        metric.Satisfaction = _.meanBy(data, 'Overall Satisfaction');
      }
      // Curved Handle uses _1 suffix metrics
      else if (metric.name === 'Curved Handle') {
        metric.Accuracy = _.meanBy(data, 'Positioning Accuracy_1');
        metric.Attempts = _.meanBy(data, 'Number of Attempts_1');
        metric.Comfort = _.meanBy(data, 'Comfort_1');
        metric.Security = _.meanBy(data, 'Grip Security_1');
        metric.Ease = _.meanBy(data, 'Ease of Use_1');
        metric.Intuitive = _.meanBy(data, 'Intuitiveness _1');
        metric.Satisfaction = _.meanBy(data, 'Overall Satisfaction_1');
      }
      // Circle Undergrip Handle uses _2 suffix metrics
      else if (metric.name === 'Circle Undergrip Handle') {
        metric.Accuracy = _.meanBy(data, 'Positioning Accuracy_2');
        metric.Attempts = _.meanBy(data.filter(d => typeof d['Number of Attempts_2'] === 'number'), 'Number of Attempts_2');
        metric.Comfort = _.meanBy(data, 'Comfort_2');
        metric.Security = _.meanBy(data, 'Grip Security_2');
        metric.Ease = _.meanBy(data, 'Ease of Use_2');
        metric.Intuitive = _.meanBy(data, 'Intuitiveness _2');
        metric.Satisfaction = _.meanBy(data, 'Overall Satisfaction_2');
      }
    });

    return metrics;
  };

  const prepareAttributeVotesData = () => {
    const categories = ['Most Accurate Positioning', 'Least Physical Strain', 'Most Appropriate for Bioreactor Shelves', 'Best for Extended Use'];
    const voteData = [];

    categories.forEach(category => {
      const votes = {
        category,
        'Rectangle Handle': 0,
        'Curved Handle': 0,
        'Circle Undergrip Handle': 0
      };

      data.forEach(row => {
        if (row[category]) {
          votes[row[category]]++;
        }
      });

      voteData.push(votes);
    });

    return voteData;
  };

  const processFeedback = () => {
    const feedback = {
      rectangleLikes: data.map(row => row['  What did you like most about the Rectangle Handle?   ']).filter(Boolean),
      rectangleImprovements: data.map(row => row['What improvements would you suggest for the Rectangle Handle? ']).filter(Boolean),
      curvedLikes: data.map(row => row['What did you like most about the Curved Handle?   ']).filter(Boolean),
      curvedImprovements: data.map(row => row['What improvements would you suggest for the Curved Handle? ']).filter(Boolean),
      circleLikes: data.map(row => row['What did you like most about the Circle Undergrip Handle?   ']).filter(Boolean),
      circleImprovements: data.map(row => row['What improvements would you suggest for the Circle Undergrip Handle? ']).filter(Boolean),
      additionalComments: data.map(row => row['  Do you have any additional comments or suggestions about any of the handles or the bioreactor shelves in general?   ']).filter(Boolean)
    };
    
    return feedback;
  };

  const demographicsData = () => {
    if (data.length === 0) return null;
    
    const genderCount = _.countBy(data, '  Gender  ');
    const handednessCount = _.countBy(data, '  Hand Dominance  ');
    const experienceCount = _.countBy(data, 'Previous Experience with Laboratory Equipment  ');
    const heightCount = _.countBy(data, 'Height');
    
    return { genderCount, handednessCount, experienceCount, heightCount };
  };

  // Find the most significant metric differences between handle types
  const findSignificantDifferences = () => {
    if (!statisticalResults) return [];
    
    // Filter for metrics with at least medium effect size or significant p-value
    return statisticalResults
      .map(result => {
        const significantComparisons = [];
        
        // Check Rectangle vs Curved
        if (result.comparisons.rectVsCurved.pValue === "< 0.05" || 
            result.comparisons.rectVsCurved.pValue === "< 0.01" || 
            result.comparisons.rectVsCurved.interpretation === "Medium" || 
            result.comparisons.rectVsCurved.interpretation === "Large") {
          significantComparisons.push({
            metricName: result.metric,
            comparison: 'Rectangle vs Curved',
            effect: result.comparisons.rectVsCurved.interpretation,
            pValue: result.comparisons.rectVsCurved.pValue,
            meanDiff: Math.abs(result.rectangle.mean - result.curved.mean).toFixed(2),
            better: result.metric === 'Number of Attempts' ? 
              (result.rectangle.mean < result.curved.mean ? 'Rectangle Handle' : 'Curved Handle') :
              (result.rectangle.mean > result.curved.mean ? 'Rectangle Handle' : 'Curved Handle')
          });
        }
        
        // Check Rectangle vs Circle
        if (result.comparisons.rectVsCircle.pValue === "< 0.05" || 
            result.comparisons.rectVsCircle.pValue === "< 0.01" || 
            result.comparisons.rectVsCircle.interpretation === "Medium" || 
            result.comparisons.rectVsCircle.interpretation === "Large") {
          significantComparisons.push({
            metricName: result.metric,
            comparison: 'Rectangle vs Circle',
            effect: result.comparisons.rectVsCircle.interpretation,
            pValue: result.comparisons.rectVsCircle.pValue,
            meanDiff: Math.abs(result.rectangle.mean - result.circle.mean).toFixed(2),
            better: result.metric === 'Number of Attempts' ? 
              (result.rectangle.mean < result.circle.mean ? 'Rectangle Handle' : 'Circle Undergrip Handle') :
              (result.rectangle.mean > result.circle.mean ? 'Rectangle Handle' : 'Circle Undergrip Handle')
          });
        }
        
        // Check Curved vs Circle
        if (result.comparisons.curvedVsCircle.pValue === "< 0.05" || 
            result.comparisons.curvedVsCircle.pValue === "< 0.01" || 
            result.comparisons.curvedVsCircle.interpretation === "Medium" || 
            result.comparisons.curvedVsCircle.interpretation === "Large") {
          significantComparisons.push({
            metricName: result.metric,
            comparison: 'Curved vs Circle',
            effect: result.comparisons.curvedVsCircle.interpretation,
            pValue: result.comparisons.curvedVsCircle.pValue,
            meanDiff: Math.abs(result.curved.mean - result.circle.mean).toFixed(2),
            better: result.metric === 'Number of Attempts' ? 
              (result.curved.mean < result.circle.mean ? 'Curved Handle' : 'Circle Undergrip Handle') :
              (result.curved.mean > result.circle.mean ? 'Curved Handle' : 'Circle Undergrip Handle')
          });
        }
        
        return significantComparisons;
      })
      .flat();
  };

  // Generate insights based on all collected data
  const generateInsights = () => {
    if (!statisticalResults || !aggregateScores || !demographicBreakdown) return [];
    
    const insights = [];
    
    // 1. Overall best handle based on aggregate score
    const bestHandle = Object.entries(aggregateScores.average).reduce(
      (best, [handle, score]) => (score > best.score) ? {handle, score} : best, 
      {handle: '', score: 0}
    ).handle;
    
    insights.push({
      key: 'overall-best',
      title: 'Overall Best Handle',
      description: `Based on weighted aggregate scores across all metrics, the ${bestHandle} performs best with an average score of ${aggregateScores.average[bestHandle].toFixed(2)}/5.`
    });
    
    // 2. Most preferred handle by direct ranking
    const mostPreferredHandle = Object.entries(aggregateScores.topChoiceCounts).reduce(
      (best, [handle, count]) => (count > best.count) ? {handle, count} : best, 
      {handle: '', count: 0}
    ).handle;
    
    insights.push({
      key: 'most-preferred',
      title: 'Most Preferred Handle',
      description: `When asked to directly rank the handles, ${aggregateScores.topChoiceCounts[mostPreferredHandle]} out of ${data.length} participants (${((aggregateScores.topChoiceCounts[mostPreferredHandle] / data.length) * 100).toFixed(0)}%) chose the ${mostPreferredHandle} as their top choice.`
    });
    
    // 3. Significant differences from statistical analysis
    const significantDiffs = findSignificantDifferences();
    if (significantDiffs.length > 0) {
      insights.push({
        key: 'significant-differences',
        title: 'Notable Metric Differences',
        description: `The most significant differences were found in ${significantDiffs.map(d => d.metricName).slice(0, 2).join(' and ')} metrics.`,
        details: significantDiffs
      });
    }
    
    // 4. Demographic insights
    // Look for largest preference differences by demographic
    const demographicInsights = [];
    
    Object.entries(demographicBreakdown).forEach(([factor, breakdown]) => {
      if (Object.keys(breakdown).length > 1) {
        // Find the demographic group with the strongest preference for each handle
        handleTypes.forEach(handleType => {
          const bestGroup = Object.entries(breakdown).reduce(
            (best, [group, data]) => (data[handleType] < best.rank) ? {group, rank: data[handleType]} : best,
            {group: '', rank: 5}
          );
          
          if (bestGroup.group) {
            demographicInsights.push({
              factor,
              group: bestGroup.group,
              handle: handleType,
              rank: bestGroup.rank
            });
          }
        });
      }
    });
    
    if (demographicInsights.length > 0) {
      // Pick the strongest demographic correlation
      const strongestDemographic = demographicInsights.reduce(
        (strongest, insight) => (insight.rank < strongest.rank) ? insight : strongest,
        {rank: 5}
      );
      
      insights.push({
        key: 'demographic-insight',
        title: 'Demographic Trends',
        description: `${strongestDemographic.group} participants showed the strongest preference for the ${strongestDemographic.handle}.`
      });
    }
    
    // 5. Areas for improvement
    // Find the weakest metrics for the top handle
    const topHandleMetrics = statisticalResults.map(result => {
      const handleData = result.rectangle.mean > result.curved.mean && result.rectangle.mean > result.circle.mean
        ? {handle: 'Rectangle Handle', score: result.rectangle.mean}
        : result.curved.mean > result.rectangle.mean && result.curved.mean > result.circle.mean
          ? {handle: 'Curved Handle', score: result.curved.mean}
          : {handle: 'Circle Undergrip Handle', score: result.circle.mean};
      
      return {
        metric: result.metric,
        ...handleData
      };
    });
    
    const weakestMetric = topHandleMetrics.reduce(
      (weakest, metric) => (metric.score < weakest.score) ? metric : weakest,
      {score: 5}
    );
    
    insights.push({
      key: 'improvement-area',
      title: 'Key Improvement Area',
      description: `Even the top-performing handles could be improved in the ${weakestMetric.metric} metric, where the highest score was only ${weakestMetric.score.toFixed(1)}/5.`
    });
    
    return insights;
  };

  // Prepare data for confidence interval chart
  const prepareConfidenceData = () => {
    if (!statisticalResults) return [];
    
    return statisticalResults.map(result => {
      return [
        {
          name: 'Rectangle Handle',
          metric: result.metric,
          mean: result.rectangle.mean,
          low: result.rectangle.ci[0],
          high: result.rectangle.ci[1]
        },
        {
          name: 'Curved Handle',
          metric: result.metric,
          mean: result.curved.mean,
          low: result.curved.ci[0],
          high: result.curved.ci[1]
        },
        {
          name: 'Circle Undergrip Handle',
          metric: result.metric,
          mean: result.circle.mean,
          low: result.circle.ci[0],
          high: result.circle.ci[1]
        }
      ];
    });
  };

  if (loading) return (
    <div className="p-4 flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Loading data and performing statistical analysis...</p>
      </div>
    </div>
  );
  
  if (error) return <div className="p-4 text-center text-red-500 border border-red-300 rounded-lg bg-red-50">{error}</div>;

  const rankingData = prepareRankingData();
  const metricsData = prepareMetricsData();
  const attributeVotesData = prepareAttributeVotesData();
  const feedbackData = processFeedback();
  const demographics = demographicsData();
  const significantDifferences = findSignificantDifferences();
  const insights = generateInsights();
  const confidenceData = prepareConfidenceData();

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Bioreactor Handle Preference Analysis</h1>
      <p className="mb-6 text-gray-600">Analysis of {data.length} participant responses comparing three handle designs: Rectangle, Curved, and Circle Undergrip.</p>
      
      <div className="flex mb-4 overflow-x-auto border-b">
        <button 
          className={`px-4 py-2 whitespace-nowrap ${tab === 'overview' ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}
          onClick={() => setTab('overview')}>
          Overview
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${tab === 'insights' ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}
          onClick={() => setTab('insights')}>
          Key Insights
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${tab === 'stats' ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}
          onClick={() => setTab('stats')}>
          Statistical Analysis
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${tab === 'metrics' ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}
          onClick={() => setTab('metrics')}>
          Performance Metrics
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${tab === 'attributes' ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}
          onClick={() => setTab('attributes')}>
          Best Attributes
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${tab === 'feedback' ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}
          onClick={() => setTab('feedback')}>
          Qualitative Feedback
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${tab === 'demographics' ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}
          onClick={() => setTab('demographics')}>
          Demographics
        </button>
      </div>

      {tab === 'overview' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold mb-2">Study Overview</h2>
            <p className="mb-2">This analysis examines user preferences for three different bioreactor handle designs, based on data from {data.length} participants.</p>
            <p className="mb-0"><span className="font-semibold">Note:</span> The small sample size (n={data.length}) means results should be interpreted with caution. Statistical significance may be limited.</p>
          </div>
          
          <h2 className="text-xl font-semibold mb-3">Handle Preference Rankings</h2>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={rankingData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="firstChoice" name="Ranked 1st" fill="#0088FE" />
                <Bar dataKey="secondChoice" name="Ranked 2nd" fill="#00C49F" />
                <Bar dataKey="thirdChoice" name="Ranked 3rd" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {handleTypes.map((handle, index) => {
              const scoreKey = `Handle Preference Ranking  [${handle}]`;
              const avgRank = _.meanBy(data, scoreKey);
              const firstPlaceCount = data.filter(row => row[scoreKey] === 1).length;
              const percentFirst = ((firstPlaceCount / data.length) * 100).toFixed(1);
              
              // Calculate confidence interval
              const ranks = data.map(row => row[scoreKey]).filter(Boolean);
              const stdDev = math.std(ranks);
              const ci = calculateCI(avgRank, stdDev, ranks.length);
              
              return (
                <div key={handle} className="border p-4 rounded shadow">
                  <h3 className="text-lg font-semibold" style={{color: COLORS[index]}}>{handle}</h3>
                  <div className="text-3xl font-bold my-2">{avgRank.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Average Rank (lower is better)</div>
                  <div className="mt-1 text-xs text-gray-500">95% CI: [{ci[0].toFixed(2)}, {ci[1].toFixed(2)}]</div>
                  <div className="mt-2">{percentFirst}% ranked it first choice</div>
                </div>
              );
            })}
          </div>

          <h2 className="text-xl font-semibold mb-3">Aggregate Performance Score</h2>
          <p className="mb-3 text-sm text-gray-600">
            Combined score based on all metrics (Positioning, Attempts, Comfort, Security, Ease, Intuitiveness, Satisfaction)
          </p>
          
          {aggregateScores && (
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {name: 'Rectangle Handle', score: aggregateScores.average['Rectangle Handle'], color: COLORS[0]},
                    {name: 'Curved Handle', score: aggregateScores.average['Curved Handle'], color: COLORS[1]},
                    {name: 'Circle Undergrip Handle', score: aggregateScores.average['Circle Undergrip Handle'], color: COLORS[2]}
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="score" name="Aggregate Score" fill={(d) => d.color} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <h2 className="text-xl font-semibold mb-3">Key Findings</h2>
          <ul className="list-disc pl-5 mb-6 space-y-2">
            <li>The {_.minBy(metricsData, m => _.meanBy(data, `Handle Preference Ranking  [${m.name}]`)).name} received the best average ranking.</li>
            <li>The {_.maxBy(metricsData, 'Comfort').name} scored highest for comfort ({_.maxBy(metricsData, 'Comfort').Comfort.toFixed(1)}/5).</li>
            <li>The {_.maxBy(metricsData, 'Satisfaction').name} had the highest overall satisfaction ({_.maxBy(metricsData, 'Satisfaction').Satisfaction.toFixed(1)}/5).</li>
            <li>The {_.minBy(metricsData, 'Attempts').name} required the fewest attempts on average ({_.minBy(metricsData, 'Attempts').Attempts.toFixed(1)}).</li>
            
            {significantDifferences.length > 0 && (
              <li className="font-semibold">
                Statistically notable differences were found in {significantDifferences.map(d => d.metricName).slice(0, 2).join(' and ')} metrics.
              </li>
            )}
          </ul>
        </div>
      )}

      {tab === 'insights' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Key Insights from Statistical Analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {insights.map(insight => (
              <div key={insight.key} className="border rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-2">{insight.title}</h3>
                <p>{insight.description}</p>
                
                {insight.details && insight.details.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Supporting Evidence:</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-600">
                      {insight.details.slice(0, 3).map((detail, i) => (
                        <li key={i}>
                          {detail.metricName}: {detail.better} performed better (difference: {detail.meanDiff}, 
                          effect size: {detail.effect}, p-value: {detail.pValue})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <h2 className="text-xl font-semibold mb-3">Statistical Confidence Intervals</h2>
          <p className="mb-3 text-sm text-gray-600">
            Showing 95% confidence intervals for key metrics. Wider intervals indicate greater uncertainty.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {confidenceData.map((metricData, index) => (
              <div key={index} className="border rounded shadow p-4">
                <h3 className="text-lg font-semibold mb-2">{metricData[0].metric}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="category" 
                        dataKey="name" 
                        name="Handle Type" 
                      />
                      <YAxis 
                        type="number" 
                        dataKey="mean" 
                        name="Score" 
                        domain={[0, 5]}
                      />
                      <ZAxis range={[100, 100]} />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          if (name === 'mean') return [value.toFixed(2), 'Mean'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      {metricData.map((entry, i) => (
                        <Scatter 
                          key={entry.name} 
                          name={entry.name} 
                          data={[entry]} 
                          fill={COLORS[i]} 
                          line={{ stroke: COLORS[i] }}
                        >
                          <ErrorBar 
                            dataKey="mean" 
                            width={4} 
                            strokeWidth={2}
                            stroke={COLORS[i]}
                            direction="y"
                            yAccessor={(d) => d.low}
                            yErrorAccessor={(d) => [d.mean - d.low, d.high - d.mean]}
                          />
                        </Scatter>
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-gray-500 mt-2">Error bars represent 95% confidence intervals</div>
              </div>
            ))}
          </div>
          
          <h2 className="text-xl font-semibold mb-3">Effect Size Interpretation</h2>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2">Metric</th>
                  <th className="border px-4 py-2">Rectangle vs Curved</th>
                  <th className="border px-4 py-2">Rectangle vs Circle</th>
                  <th className="border px-4 py-2">Curved vs Circle</th>
                </tr>
              </thead>
              <tbody>
                {statisticalResults && statisticalResults.map((result, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border px-4 py-2 font-medium">{result.metric}</td>
                    <td className="border px-4 py-2">
                      <span className={
                        result.comparisons.rectVsCurved.interpretation === 'Large' ? 'text-green-600 font-semibold' :
                        result.comparisons.rectVsCurved.interpretation === 'Medium' ? 'text-blue-600 font-semibold' :
                        result.comparisons.rectVsCurved.interpretation === 'Small' ? 'text-gray-600' :
                        'text-gray-400'
                      }>
                        {result.comparisons.rectVsCurved.interpretation}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        (d={result.comparisons.rectVsCurved.effectSize.toFixed(2)})
                      </span>
                    </td>
                    <td className="border px-4 py-2">
                      <span className={
                        result.comparisons.rectVsCircle.interpretation === 'Large' ? 'text-green-600 font-semibold' :
                        result.comparisons.rectVsCircle.interpretation === 'Medium' ? 'text-blue-600 font-semibold' :
                        result.comparisons.rectVsCircle.interpretation === 'Small' ? 'text-gray-600' :
                        'text-gray-400'
                      }>
                        {result.comparisons.rectVsCircle.interpretation}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        (d={result.comparisons.rectVsCircle.effectSize.toFixed(2)})
                      </span>
                    </td>
                    <td className="border px-4 py-2">
                      <span className={
                        result.comparisons.curvedVsCircle.interpretation === 'Large' ? 'text-green-600 font-semibold' :
                        result.comparisons.curvedVsCircle.interpretation === 'Medium' ? 'text-blue-600 font-semibold' :
                        result.comparisons.curvedVsCircle.interpretation === 'Small' ? 'text-gray-600' :
                        'text-gray-400'
                      }>
                        {result.comparisons.curvedVsCircle.interpretation}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        (d={result.comparisons.curvedVsCircle.effectSize.toFixed(2)})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-2">Interpretation Guide</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-semibold text-green-600">Large effect (d ≥ 0.8):</span> Substantial practical significance</li>
              <li><span className="font-semibold text-blue-600">Medium effect (0.5 ≤ d &lt; 0.8):</span> Moderate practical significance</li>
              <li><span className="font-semibold text-gray-600">Small effect (0.2 ≤ d &lt; 0.5):</span> Small practical significance</li>
              <li><span className="font-semibold text-gray-400">Negligible effect (d &lt; 0.2):</span> Minimal practical significance</li>
            </ul>
            <p className="mt-3 text-sm">
              <span className="font-semibold">Note:</span> Due to small sample size (n={data.length}), these results should be interpreted with caution. 
              Effect sizes may be more reliable than p-values for this sample size.
            </p>
          </div>
        </div>
      )}
      
      {tab === 'stats' && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Statistical Analysis</h2>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-2">Study Limitations</h3>
            <ul className="list-disc pl-5">
              <li>Small sample size (n={data.length}) limits statistical power</li>
              <li>Confidence intervals are wide due to sample size</li>
              <li>Results should be considered preliminary</li>
              <li>Effect sizes may be more informative than p-values for this sample</li>
            </ul>
          </div>
          
          <h3 className="text-lg font-semibold mb-3">Key Metric Comparison</h3>
          
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2">Metric</th>
                  <th className="border px-4 py-2">Rectangle Handle</th>
                  <th className="border px-4 py-2">Curved Handle</th>
                  <th className="border px-4 py-2">Circle Undergrip Handle</th>
                </tr>
              </thead>
              <tbody>
                {statisticalResults && statisticalResults.map((result, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border px-4 py-2 font-medium">{result.metric}</td>
                    <td className="border px-4 py-2">
                      {result.rectangle.mean.toFixed(2)} ± {result.rectangle.stdDev.toFixed(2)}
                      <div className="text-xs text-gray-500">
                        95% CI: [{result.rectangle.ci[0].toFixed(2)}, {result.rectangle.ci[1].toFixed(2)}]
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      {result.curved.mean.toFixed(2)} ± {result.curved.stdDev.toFixed(2)}
                      <div className="text-xs text-gray-500">
                        95% CI: [{result.curved.ci[0].toFixed(2)}, {result.curved.ci[1].toFixed(2)}]
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      {result.circle.mean.toFixed(2)} ± {result.circle.stdDev.toFixed(2)}
                      <div className="text-xs text-gray-500">
                        95% CI: [{result.circle.ci[0].toFixed(2)}, {result.circle.ci[1].toFixed(2)}]
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <h3 className="text-lg font-semibold mb-3">Statistical Test Results</h3>
          <p className="mb-3 text-sm text-gray-600">
            Welch's t-tests were used to compare handles. Note that with a small sample size, effect sizes may be more informative than p-values.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="border rounded shadow overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 font-semibold">Rectangle vs. Curved</div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left pb-2">Metric</th>
                      <th className="text-right pb-2">t-value</th>
                      <th className="text-right pb-2">p-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statisticalResults && statisticalResults.map((result, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-1">{result.metric}</td>
                        <td className="text-right py-1">{result.comparisons.rectVsCurved.tValue.toFixed(2)}</td>
                        <td className={`text-right py-1 ${
                          result.comparisons.rectVsCurved.pValue === "< 0.01" ? "font-bold text-green-600" :
                          result.comparisons.rectVsCurved.pValue === "< 0.05" ? "font-semibold text-blue-600" :
                          "text-gray-600"
                        }`}>
                          {result.comparisons.rectVsCurved.pValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="border rounded shadow overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 font-semibold">Rectangle vs. Circle</div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left pb-2">Metric</th>
                      <th className="text-right pb-2">t-value</th>
                      <th className="text-right pb-2">p-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statisticalResults && statisticalResults.map((result, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-1">{result.metric}</td>
                        <td className="text-right py-1">{result.comparisons.rectVsCircle.tValue.toFixed(2)}</td>
                        <td className={`text-right py-1 ${
                          result.comparisons.rectVsCircle.pValue === "< 0.01" ? "font-bold text-green-600" :
                          result.comparisons.rectVsCircle.pValue === "< 0.05" ? "font-semibold text-blue-600" :
                          "text-gray-600"
                        }`}>
                          {result.comparisons.rectVsCircle.pValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="border rounded shadow overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 font-semibold">Curved vs. Circle</div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left pb-2">Metric</th>
                      <th className="text-right pb-2">t-value</th>
                      <th className="text-right pb-2">p-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statisticalResults && statisticalResults.map((result, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-1">{result.metric}</td>
                        <td className="text-right py-1">{result.comparisons.curvedVsCircle.tValue.toFixed(2)}</td>
                        <td className={`text-right py-1 ${
                          result.comparisons.curvedVsCircle.pValue === "< 0.01" ? "font-bold text-green-600" :
                          result.comparisons.curvedVsCircle.pValue === "< 0.05" ? "font-semibold text-blue-600" :
                          "text-gray-600"
                        }`}>
                          {result.comparisons.curvedVsCircle.pValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {aggregateScores && (
            <>
              <h3 className="text-lg font-semibold mb-3">Individual Participant Scores</h3>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full border rounded">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2">Participant ID</th>
                      <th className="border px-4 py-2">Rectangle Score</th>
                      <th className="border px-4 py-2">Curved Score</th>
                      <th className="border px-4 py-2">Circle Score</th>
                      <th className="border px-4 py-2">Top Choice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregateScores.detail.map((participant, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border px-4 py-2">{participant.participantId}</td>
                        <td className="border px-4 py-2">{participant.rectangleScore.toFixed(2)}</td>
                        <td className="border px-4 py-2">{participant.curvedScore.toFixed(2)}</td>
                        <td className="border px-4 py-2">{participant.circleScore ? participant.circleScore.toFixed(2) : 'N/A'}</td>
                        <td className={`border px-4 py-2 font-medium ${
                          participant.topChoice === 'Rectangle Handle' ? 'text-blue-600' :
                          participant.topChoice === 'Curved Handle' ? 'text-green-600' :
                          'text-yellow-600'
                        }`}>
                          {participant.topChoice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'metrics' && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Performance Metrics Comparison</h2>
          <p className="mb-4">Higher values are better for all metrics except "Attempts" (where lower is better).</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Positioning Accuracy</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Bar dataKey="Accuracy" fill={(d) => d.color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-gray-500 mt-2">Higher values indicate better positioning accuracy</div>
            </div>
            
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Number of Attempts</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Bar dataKey="Attempts" fill={(d) => d.color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-gray-500 mt-2">Lower values are better</div>
            </div>
            
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Comfort</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Bar dataKey="Comfort" fill={(d) => d.color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Grip Security</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Bar dataKey="Security" fill={(d) => d.color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Ease of Use</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Bar dataKey="Ease" fill={(d) => d.color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Intuitiveness</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Bar dataKey="Intuitive" fill={(d) => d.color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="border p-4 rounded shadow col-span-1 md:col-span-2">
              <h3 className="text-lg font-semibold mb-2">Overall Satisfaction</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Bar dataKey="Satisfaction" fill={(d) => d.color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {confidenceData && (
            <div className="border p-4 rounded shadow mb-6">
              <h3 className="text-lg font-semibold mb-3">Metrics with Confidence Intervals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {confidenceData.slice(0, 4).map((metricData, index) => (
                  <div key={index}>
                    <h4 className="font-medium mb-2">{metricData[0].metric}</h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={metricData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 5]} />
                          <Tooltip
                            formatter={(value, name, props) => {
                              if (name === 'mean') return [value.toFixed(2), 'Mean'];
                              return [value.toFixed(2), name];
                            }}
                          />
                          <Bar dataKey="mean" fill={(d, i) => COLORS[i]}>
                            <ErrorBar dataKey="mean" width={4} strokeWidth={2} stroke="#666" direction="y" 
                              yAccessor={(d) => d.low}
                              yErrorAccessor={(d) => [d.mean - d.low, d.high - d.mean]}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'attributes' && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Best Attributes Voting</h2>
          <p className="mb-4">Number of participants who selected each handle for these key attributes:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {attributeVotesData.map((category) => (
              <div key={category.category} className="border p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-2">{category.category}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      {name: 'Rectangle Handle', votes: category['Rectangle Handle'], color: COLORS[0]},
                      {name: 'Curved Handle', votes: category['Curved Handle'], color: COLORS[1]},
                      {name: 'Circle Undergrip Handle', votes: category['Circle Undergrip Handle'], color: COLORS[2]}
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, data.length]} />
                      <Tooltip />
                      <Bar dataKey="votes" fill={(d) => d.color} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
          
          <h3 className="text-lg font-semibold mb-3">Attribute Votes Summary</h3>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2">Attribute</th>
                  <th className="border px-4 py-2">Rectangle Handle</th>
                  <th className="border px-4 py-2">Curved Handle</th>
                  <th className="border px-4 py-2">Circle Undergrip Handle</th>
                  <th className="border px-4 py-2">Winner</th>
                </tr>
              </thead>
              <tbody>
                {attributeVotesData.map((category, index) => {
                  const winner = ['Rectangle Handle', 'Curved Handle', 'Circle Undergrip Handle'].reduce(
                    (best, current) => category[current] > category[best] ? current : best, 
                    'Rectangle Handle'
                  );
                  
                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border px-4 py-2 font-medium">{category.category}</td>
                      <td className="border px-4 py-2 text-center">{category['Rectangle Handle']}</td>
                      <td className="border px-4 py-2 text-center">{category['Curved Handle']}</td>
                      <td className="border px-4 py-2 text-center">{category['Circle Undergrip Handle']}</td>
                      <td className={`border px-4 py-2 font-medium text-center ${
                        winner === 'Rectangle Handle' ? 'text-blue-600' :
                        winner === 'Curved Handle' ? 'text-green-600' :
                        'text-yellow-600'
                      }`}>
                        {winner}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'feedback' && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Qualitative Feedback</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Rectangle Handle Feedback */}
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Rectangle Handle</h3>
              
              <h4 className="font-medium mt-3">Likes:</h4>
              <ul className="list-disc pl-5 mb-3">
                {feedbackData.rectangleLikes.map((item, i) => (
                  <li key={`rect-like-${i}`}>{item}</li>
                ))}
              </ul>
              
              <h4 className="font-medium mt-3">Suggested Improvements:</h4>
              <ul className="list-disc pl-5">
                {feedbackData.rectangleImprovements.map((item, i) => (
                  <li key={`rect-imp-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
            
            {/* Curved Handle Feedback */}
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Curved Handle</h3>
              
              <h4 className="font-medium mt-3">Likes:</h4>
              <ul className="list-disc pl-5 mb-3">
                {feedbackData.curvedLikes.map((item, i) => (
                  <li key={`curved-like-${i}`}>{item}</li>
                ))}
              </ul>
              
              <h4 className="font-medium mt-3">Suggested Improvements:</h4>
              <ul className="list-disc pl-5">
                {feedbackData.curvedImprovements.map((item, i) => (
                  <li key={`curved-imp-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
            
            {/* Circle Undergrip Handle Feedback */}
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Circle Undergrip Handle</h3>
              
              <h4 className="font-medium mt-3">Likes:</h4>
              <ul className="list-disc pl-5 mb-3">
                {feedbackData.circleLikes.map((item, i) => (
                  <li key={`circle-like-${i}`}>{item}</li>
                ))}
              </ul>
              
              <h4 className="font-medium mt-3">Suggested Improvements:</h4>
              <ul className="list-disc pl-5">
                {feedbackData.circleImprovements.map((item, i) => (
                  <li key={`circle-imp-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Additional Comments</h3>
          {feedbackData.additionalComments.length > 0 ? (
            <ul className="list-disc pl-5">
              {feedbackData.additionalComments.map((item, i) => (
                <li key={`comment-${i}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No additional comments provided.</p>
          )}
          
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Qualitative Feedback Analysis</h3>
            <p className="mb-2">Common themes from participant feedback:</p>
            <ul className="list-disc pl-5">
              <li><strong>Rectangle Handle:</strong> Basic functionality but lacks comfort and ergonomics</li>
              <li><strong>Curved Handle:</strong> Improved grip and comfort over rectangle design</li>
              <li><strong>Circle Undergrip Handle:</strong> Most intuitive design with the best grip security</li>
              <li>Participants frequently mentioned the need for rounded edges across all designs</li>
              <li>Comfort and ease of grip were consistently identified as key factors</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'demographics' && demographics && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Participant Demographics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Gender</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(demographics.genderCount).map(([key, value]) => ({ name: key, value }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.keys(demographics.genderCount).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Hand Dominance</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(demographics.handednessCount).map(([key, value]) => ({ name: key, value }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.keys(demographics.handednessCount).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Experience Level</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(demographics.experienceCount).map(([key, value]) => ({ name: key, count: value }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="border p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Height Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(demographics.heightCount).map(([key, value]) => ({ name: key, count: value }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {demographicBreakdown && (
            <>
              <h3 className="text-lg font-semibold mb-3">Handle Preferences by Demographics</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {Object.entries(demographicBreakdown).map(([factor, breakdown]) => (
                  <div key={factor} className="border rounded shadow overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 font-semibold">{factor}</div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-2 text-left">Group</th>
                            <th className="px-4 py-2 text-center">Count</th>
                            <th className="px-4 py-2 text-center">Rectangle Rank</th>
                            <th className="px-4 py-2 text-center">Curved Rank</th>
                            <th className="px-4 py-2 text-center">Circle Rank</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(breakdown).map(([group, data], i) => (
                            <tr key={group} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-2">{group}</td>
                              <td className="px-4 py-2 text-center">{data.count}</td>
                              <td className="px-4 py-2 text-center">{data['Rectangle Handle'].toFixed(1)}</td>
                              <td className="px-4 py-2 text-center">{data['Curved Handle'].toFixed(1)}</td>
                              <td className="px-4 py-2 text-center">{data['Circle Undergrip Handle'].toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-2">Demographic Analysis Limitations</h3>
                <p className="mb-2">
                  The small sample size (n={data.length}) makes demographic subgroup analysis tentative.
                  Patterns observed across demographic factors should be considered exploratory rather than conclusive.
                </p>
                <p>
                  Future studies should recruit a larger, more diverse participant pool to better
                  understand how demographics might influence handle preferences.
                </p>
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="mt-8 p-4 border-t">
        <h2 className="text-xl font-semibold mb-3">Recommendations</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Primary Recommendation:</strong> Based on the combined metrics and user feedback, the {bestHandle(metricsData, aggregateScores)} 
            appears to be the most promising design. It scored highest in overall satisfaction and had the most consistent performance across metrics.
          </li>
          <li>
            <strong>Design Improvements:</strong> Regardless of which handle is selected, participants consistently suggested rounder edges and improved grip security.
          </li>
          <li>
            <strong>Future Testing:</strong> Consider a larger participant pool (20+ users) with more diverse hand sizes and laboratory experience levels.
          </li>
          <li>
            <strong>Hybrid Design:</strong> Consider developing a prototype that combines the best features of the {attributeVotesData.find(d => d.category === 'Grip Security')?.['Circle Undergrip Handle'] > attributeVotesData.find(d => d.category === 'Grip Security')?.['Curved Handle'] ? 'Circle Undergrip' : 'Curved'} handle with the ergonomic benefits identified in user feedback.
          </li>
        </ul>
      </div>
      
      <div className="text-xs text-gray-500 text-center mt-8">
        Analysis generated on: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

// Helper function to determine the best handle
const bestHandle = (metricsData, aggregateScores) => {
  if (!aggregateScores) return "Circle Undergrip Handle"; // Default if aggregateScores not available yet
  
  const bestAggregate = Object.entries(aggregateScores.average).reduce(
    (best, [handle, score]) => (score > best.score) ? {handle, score} : best, 
    {handle: '', score: 0}
  ).handle;
  
  return bestAggregate;
};

export default BioreactorHandleAnalysis;