List<CronTrigger> jobs = [SELECT Id FROM CronTrigger WHERE CronJobDetail.Name != 'WeShareTransactionStatusSchedule Job'];
for (CronTrigger job : jobs){
    System.abortJob(job.Id);
}