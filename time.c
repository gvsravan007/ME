#include<stdio.h>

struct patients
{
    char name[20];
    int id;
    float age;
    char bg[4];
};
 
struct patients details()
{
  struct patients s;
    scanf(" %s %d %f %s",s.name,&s.id,&s.age,s.bg);
    return s;
}
void printpatients(struct patients s)
{
    printf("%s %d %f %s\n",s.name,s.id,s.age,s.bg);
}
int query ()
{
  int k;
    printf("give the query as\n k:");
    scanf("%d",&k);
    return k;
}
int y()
{
  int a;
    scanf("%d",&a);
    return a;
}
int main()
{
    int n;
     printf ("give your no of patients as \n n:");
     scanf("%d",&n);
     
    
    struct patients b[n];
    printf("enter the patients details\n");
    for(int i=0;i<n ;i++)
    {
     b[i] = details();
    }
    printf("patient details are:\n");
    for(int i=0;i<n;i++)
    {
        printpatients(b[i]);
    }
    int k,a;
    float z= 0.0;
    
    
    while(1)
    {
        k = query();
        if(k==0)
        {
            for (int i=0;i<n;i++)
            {
                z+=b[i].age;
            }
            printf("the average age :%f\n",z/5.f);
          
        }
        else if(k==1)
        {
            printf("enter patients  id number:");
            a =y();
            for(int i=0;i<n+1;i++)
            {
               if(i == n)
               {
                printf("no patient is found\n");
                break;
               }
                if(a==b[i].id)
                {
                printf(" %s has this id %d\n",b[i].name,b[i].id);
                break;
                }
                

            }
            
        }
        else
        {
            break;
        }
    }

        
    
}    















